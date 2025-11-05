const Message = require('../models/Message');
const Session = require('../models/Session');
const Prompt = require('../models/Prompt');
const providerManager = require('../providers');
const config = require('../config');
const crypto = require('crypto');

class ContextManager {
  constructor() {
    this.maxContextTokens = config.maxContextTokens;
    this.summarizationThreshold = config.summarizationThreshold;
  }

  async getContextForSession(sessionId, includeSystem = true) {
    try {
      const session = await Session.findOne({ sessionId, isActive: true });
      if (!session) {
        throw new Error('Session not found');
      }

      const messages = await Message.getConversationHistory(sessionId);
      const context = {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt
        })),
        totalTokens: session.context.totalTokens,
        messageCount: session.context.messageCount,
        systemPrompt: includeSystem ? session.systemPrompt : null
      };

      return context;
    } catch (error) {
      throw new Error(`Failed to get context: ${error.message}`);
    }
  }

  async addMessageToContext(sessionId, role, content, metadata = {}) {
    try {
      const session = await Session.findOne({ sessionId, isActive: true });
      if (!session) {
        throw new Error('Session not found');
      }

      // Estimate token count
      const tokenCount = metadata.tokenCount || this._estimateTokens(content);

      // Create message
      const message = new Message({
        sessionId,
        userId: session.userId,
        role,
        content,
        metadata: {
          ...metadata,
          tokenCount
        }
      });

      await message.save();

      // Update session context
      session.updateContext(tokenCount, 1);
      await session.save();

      // Check if summarization is needed
      if (session.needsSummarization()) {
        await this.summarizeContext(sessionId);
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }
  }

  async summarizeContext(sessionId) {
    try {
      const session = await Session.findOne({ sessionId, isActive: true });
      if (!session) {
        throw new Error('Session not found');
      }

      // Get messages to summarize (exclude recent ones)
      const cutoffDate = new Date();
      cutoffDate.setMinutes(cutoffDate.getMinutes() - 10); // Keep last 10 minutes

      const messagesToSummarize = await Message.getMessagesForSummarization(
        sessionId, 
        cutoffDate
      );

      if (messagesToSummarize.length < 2) {
        return; // Not enough messages to summarize
      }

      // Get summarization prompt
      const summaryPrompt = await Prompt.getSummarizationPrompt();
      const systemPrompt = summaryPrompt ? summaryPrompt.content : 
        'Summarize the following conversation concisely, preserving key context and information:';

      // Prepare conversation text
      const conversationText = messagesToSummarize
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Generate summary using configured provider
      const provider = providerManager.getProvider(config.summarizationModel.includes('gpt') ? 'openai' : 'mock');
      const summaryResponse = await provider.generateResponse({
        messages: [{ role: 'user', content: conversationText }],
        systemPrompt,
        options: { 
          model: config.summarizationModel,
          maxTokens: 500,
          temperature: 0.3
        }
      });

      // Create summary hash for deduplication
      const summaryHash = crypto
        .createHash('md5')
        .update(conversationText)
        .digest('hex');

      // Replace messages with summary
      const messageIds = messagesToSummarize.map(msg => msg._id);
      await Message.replaceWithSummary(
        sessionId, 
        messageIds, 
        summaryResponse.text, 
        summaryHash
      );

      // Update session context
      const tokensSaved = messagesToSummarize.reduce((sum, msg) => sum + msg.metadata.tokenCount, 0);
      const summaryTokens = summaryResponse.usage.totalTokens;
      
      session.context.totalTokens = session.context.totalTokens - tokensSaved + summaryTokens;
      session.context.messageCount = session.context.messageCount - messagesToSummarize.length + 1;
      session.context.lastSummarizedAt = new Date();
      session.context.summaryHash = summaryHash;

      await session.save();

      return {
        messagesSummarized: messagesToSummarize.length,
        tokensSaved: tokensSaved - summaryTokens,
        summaryTokens
      };
    } catch (error) {
      console.error('Summarization failed:', error);
      // Don't throw - summarization failure shouldn't break the chat
      return null;
    }
  }

  async clearContext(sessionId, keepSystemPrompt = true) {
    try {
      const session = await Session.findOne({ sessionId, isActive: true });
      if (!session) {
        throw new Error('Session not found');
      }

      // Delete all messages except system messages if keepSystemPrompt is true
      const deleteQuery = { sessionId };
      if (keepSystemPrompt) {
        deleteQuery.role = { $ne: 'system' };
      }

      await Message.deleteMany(deleteQuery);

      // Reset session context
      session.context.totalTokens = 0;
      session.context.messageCount = 0;
      session.context.lastSummarizedAt = null;
      session.context.summaryHash = null;

      await session.save();

      return { success: true, messagesDeleted: true };
    } catch (error) {
      throw new Error(`Failed to clear context: ${error.message}`);
    }
  }

  async getContextStats(sessionId) {
    try {
      const session = await Session.findOne({ sessionId, isActive: true });
      if (!session) {
        throw new Error('Session not found');
      }

      const tokenUsage = await Message.getSessionTokenUsage(sessionId);
      const stats = tokenUsage[0] || {
        totalTokens: 0,
        messageCount: 0,
        userMessages: 0,
        assistantMessages: 0
      };

      return {
        ...stats,
        maxTokens: this.maxContextTokens,
        summarizationThreshold: this.summarizationThreshold,
        needsSummarization: stats.totalTokens > this.summarizationThreshold,
        lastSummarizedAt: session.context.lastSummarizedAt
      };
    } catch (error) {
      throw new Error(`Failed to get context stats: ${error.message}`);
    }
  }

  _estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil((text || '').length / 4);
  }

  // Retention policy - cleanup old contexts
  async cleanupOldContexts(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Find sessions to cleanup
      const oldSessions = await Session.find({
        lastActivityAt: { $lt: cutoffDate },
        isActive: false
      }).select('sessionId');

      const sessionIds = oldSessions.map(s => s.sessionId);

      if (sessionIds.length > 0) {
        // Delete messages
        const messageResult = await Message.deleteMany({
          sessionId: { $in: sessionIds }
        });

        // Delete sessions
        const sessionResult = await Session.deleteMany({
          sessionId: { $in: sessionIds }
        });

        return {
          sessionsDeleted: sessionResult.deletedCount,
          messagesDeleted: messageResult.deletedCount
        };
      }

      return { sessionsDeleted: 0, messagesDeleted: 0 };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }
}

module.exports = new ContextManager();