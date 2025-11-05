const express = require('express');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Session = require('../models/Session');
const Message = require('../models/Message');
const { authenticateToken } = require('./auth');
const providerManager = require('../providers');
const contextManager = require('../services/contextManager');
const rateLimiter = require('../services/rateLimiter');
const safety = require('../services/safety');
const observability = require('../services/observability');

const router = express.Router();

// Rate limiting for chat endpoints
const chatRateLimit = rateLimiter.createMiddleware({
  keyGenerator: (req) => `chat:${req.user.userId}`,
  maxRequests: 50,
  windowMs: 15 * 60 * 1000 // 15 minutes
});

// Create or get session
router.post('/session', authenticateToken, chatRateLimit, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { provider, model, systemPrompt, temperature, maxTokens } = req.body;
    const userId = req.user.userId;

    // Validate session data
    const sessionData = safety.validateSession({
      provider: provider || 'openai',
      model,
      temperature,
      maxTokens,
      systemPrompt: systemPrompt || ''
    });

    // Create new session
    const sessionId = uuidv4();
    const session = new Session({
      sessionId,
      userId,
      provider: sessionData.provider,
      model: sessionData.model || 'gpt-4o-mini',
      systemPrompt: sessionData.systemPrompt,
      settings: {
        temperature: sessionData.temperature || 0.7,
        maxTokens: sessionData.maxTokens || 1000
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await session.save();

    // Record session start
    observability.recordSession('start', sessionId, userId, correlationId);

    observability.info('New session created', {
      sessionId,
      userId,
      provider: session.provider,
      correlationId
    });

    res.status(201).json({
      sessionId,
      provider: session.provider,
      model: session.model,
      settings: session.settings,
      systemPrompt: session.systemPrompt
    });

  } catch (error) {
    observability.error('Failed to create session', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message
    });
  }
});

// Send message and get immediate response (non-streaming)
router.post('/message/simple', authenticateToken, chatRateLimit, async (req, res) => {
  const correlationId = req.correlationId;
  const startTime = Date.now();
  
  try {
    const { sessionId, message, provider } = req.body;
    const userId = req.user.userId;

    // Validate message
    const messageData = safety.validateMessage({
      content: message,
      role: 'user',
      sessionId
    });

    // Get user and check quotas
    const user = await User.findById(userId);
    if (!user || user.hasExceededQuotas()) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'Daily usage quota exceeded'
      });
    }

    // Get session
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or inactive'
      });
    }

    // Safety checks
    const safetyCheck = safety.checkContentSafety(messageData.content);
    if (safetyCheck.flagged && safetyCheck.confidence > 0.95) {
      safety.logSafetyEvent('message-flagged', {
        userId,
        sessionId,
        flags: safetyCheck.flags,
        correlationId
      });

      return res.status(400).json({
        error: 'Content flagged',
        message: 'Your message contains inappropriate content',
        flags: safetyCheck.flags
      });
    }

    // Add user message to context
    const userMessage = await contextManager.addMessageToContext(
      sessionId,
      'user',
      messageData.content,
      { correlationId }
    );

    // Generate title from first message
    if (session.context.messageCount === 1) {
      session.generateTitle(messageData.content);
      await session.save();
    }

    // Get conversation context
    const context = await contextManager.getContextForSession(sessionId);

    // Get provider
    const selectedProvider = provider || session.provider;
    const aiProvider = await providerManager.getWorkingProvider(selectedProvider);

    try {
      // Generate response using non-streaming method
      const result = await aiProvider.generateResponse({
        messages: context.messages,
        systemPrompt: context.systemPrompt,
        options: {
          model: session.model,
          temperature: session.settings.temperature,
          maxTokens: session.settings.maxTokens
        }
      });

      // Create assistant message
      const assistantMessage = await contextManager.addMessageToContext(
        sessionId,
        'assistant',
        result.text,
        {
          provider: aiProvider.name,
          model: session.model,
          usage: result.usage,
          responseTime: Date.now() - startTime,
          correlationId
        }
      );

      // Update session context
      session.updateContext(result.usage?.totalTokens || 0);
      await session.save();

      // Update user usage
      user.updateUsage(result.usage?.totalTokens || 0);
      await user.save();

      // Record metrics
      observability.recordRequest(
        '/chat/message/simple',
        aiProvider.name,
        true,
        Date.now() - startTime,
        correlationId
      );

      observability.recordTokenUsage(
        aiProvider.name,
        userId,
        result.usage?.totalTokens || 0,
        correlationId
      );

      observability.info('Message processed successfully', {
        sessionId,
        userId,
        provider: aiProvider.name,
        tokens: result.usage?.totalTokens || 0,
        responseTime: Date.now() - startTime,
        correlationId
      });

      // Return the response
      res.json({
        success: true,
        userMessage: {
          id: userMessage._id,
          content: userMessage.content,
          role: 'user',
          createdAt: userMessage.createdAt
        },
        assistantMessage: {
          id: assistantMessage._id,
          content: result.text,
          role: 'assistant',
          createdAt: assistantMessage.createdAt,
          metadata: {
            provider: aiProvider.name,
            model: session.model,
            usage: result.usage,
            responseTime: Date.now() - startTime
          }
        }
      });

    } catch (providerError) {
      // Fallback to safe response
      const safeResponse = safety.generateSafeResponse(providerError, { 
        provider: aiProvider.name,
        sessionId 
      });

      const assistantMessage = await contextManager.addMessageToContext(
        sessionId,
        'assistant',
        safeResponse.text,
        {
          provider: aiProvider.name,
          error: providerError.message,
          correlationId
        }
      );

      observability.error('Provider error, used fallback', providerError, { 
        sessionId, 
        userId, 
        correlationId 
      });

      res.json({
        success: true,
        userMessage: {
          id: userMessage._id,
          content: userMessage.content,
          role: 'user',
          createdAt: userMessage.createdAt
        },
        assistantMessage: {
          id: assistantMessage._id,
          content: safeResponse.text,
          role: 'assistant',
          createdAt: assistantMessage.createdAt,
          metadata: {
            provider: aiProvider.name,
            fallback: true,
            error: providerError.message
          }
        }
      });
    }

  } catch (error) {
    observability.error('Chat message failed', error, { 
      userId: req.user.userId, 
      correlationId 
    });

    res.status(500).json({
      error: 'Message processing failed',
      message: error.message
    });
  }
});

// Send message and get streaming response
router.post('/message', authenticateToken, chatRateLimit, async (req, res) => {
  const correlationId = req.correlationId;
  const startTime = Date.now();
  
  try {
    const { sessionId, message, provider } = req.body;
    const userId = req.user.userId;

    // Validate message
    const messageData = safety.validateMessage({
      content: message,
      role: 'user',
      sessionId
    });

    // Get user and check quotas
    const user = await User.findById(userId);
    if (!user || user.hasExceededQuotas()) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'Daily usage quota exceeded'
      });
    }

    // Get session
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or inactive'
      });
    }

    // Safety checks
    const safetyCheck = safety.checkContentSafety(messageData.content);
    if (safetyCheck.flagged && safetyCheck.confidence > 0.95) {
      safety.logSafetyEvent('message-flagged', {
        userId,
        sessionId,
        flags: safetyCheck.flags,
        correlationId
      });

      return res.status(400).json({
        error: 'Content flagged',
        message: 'Your message contains inappropriate content',
        flags: safetyCheck.flags
      });
    }

    // Add user message to context
    const userMessage = await contextManager.addMessageToContext(
      sessionId,
      'user',
      messageData.content,
      { correlationId }
    );

    // Generate title from first message
    if (session.context.messageCount === 1) {
      session.generateTitle(messageData.content);
      await session.save();
    }

    // Get conversation context
    const context = await contextManager.getContextForSession(sessionId);

    // Get provider
    const selectedProvider = provider || session.provider;
    const aiProvider = await providerManager.getWorkingProvider(selectedProvider);

    // Create assistant message placeholder
    const assistantMessage = new Message({
      sessionId,
      userId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      metadata: {
        provider: aiProvider.name,
        model: session.model,
        isStreaming: true,
        streamingComplete: false,
        correlationId
      }
    });

    await assistantMessage.save();

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let fullResponse = '';
    let tokenCount = 0;

    try {
      // Stream response from AI provider
      await aiProvider.streamResponse({
        messages: context.messages,
        systemPrompt: context.systemPrompt,
        options: {
          model: session.model,
          temperature: session.settings.temperature,
          maxTokens: session.settings.maxTokens
        },
        onToken: (token) => {
          fullResponse += token;
          tokenCount++;
          
          // Send token to client
          res.write(`data: ${JSON.stringify({ 
            type: 'token', 
            content: token,
            messageId: assistantMessage._id
          })}\n\n`);
        },
        onDone: async (result) => {
          try {
            // Update assistant message
            assistantMessage.content = fullResponse;
            assistantMessage.status = 'completed';
            assistantMessage.metadata.streamingComplete = true;
            assistantMessage.metadata.isStreaming = false;
            assistantMessage.metadata.usage = result.usage;
            assistantMessage.metadata.responseTime = Date.now() - startTime;
            await assistantMessage.save();

            // Update session context
            session.updateContext(result.usage?.totalTokens || tokenCount);
            await session.save();

            // Update user usage
            user.updateUsage(result.usage?.totalTokens || tokenCount);
            await user.save();

            // Record metrics
            observability.recordRequest(
              '/chat/message',
              aiProvider.name,
              true,
              Date.now() - startTime,
              correlationId
            );

            observability.recordTokenUsage(
              aiProvider.name,
              userId,
              result.usage?.totalTokens || tokenCount,
              correlationId
            );

            // Send completion event
            res.write(`data: ${JSON.stringify({ 
              type: 'done', 
              messageId: assistantMessage._id,
              usage: result.usage,
              responseTime: Date.now() - startTime
            })}\n\n`);

            res.end();

            observability.info('Message processed successfully', {
              sessionId,
              userId,
              provider: aiProvider.name,
              tokens: result.usage?.totalTokens || tokenCount,
              responseTime: Date.now() - startTime,
              correlationId
            });

          } catch (error) {
            observability.error('Failed to finalize message', error, { correlationId });
            res.write(`data: ${JSON.stringify({ 
              type: 'error', 
              message: 'Failed to save response' 
            })}\n\n`);
            res.end();
          }
        },
        onError: async (error) => {
          try {
            // Mark message as error
            assistantMessage.status = 'error';
            assistantMessage.error = {
              message: error.message,
              code: error.code || 'PROVIDER_ERROR',
              retryable: true
            };
            await assistantMessage.save();

            // Record error
            observability.recordError('provider-error', aiProvider.name, error, correlationId);

            // Send error to client
            res.write(`data: ${JSON.stringify({ 
              type: 'error', 
              message: error.message,
              retryable: true
            })}\n\n`);

            res.end();

          } catch (saveError) {
            observability.error('Failed to save error state', saveError, { correlationId });
            res.end();
          }
        }
      });

    } catch (providerError) {
      // Fallback to safe response
      const safeResponse = safety.generateSafeResponse(providerError, { 
        provider: aiProvider.name,
        sessionId 
      });

      assistantMessage.content = safeResponse.text;
      assistantMessage.status = 'completed';
      assistantMessage.error = {
        message: providerError.message,
        code: 'PROVIDER_FALLBACK'
      };
      await assistantMessage.save();

      res.write(`data: ${JSON.stringify({ 
        type: 'token', 
        content: safeResponse.text 
      })}\n\n`);

      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        messageId: assistantMessage._id,
        fallback: true
      })}\n\n`);

      res.end();

      observability.error('Provider error, used fallback', providerError, { 
        sessionId, 
        userId, 
        correlationId 
      });
    }

  } catch (error) {
    observability.error('Chat message failed', error, { 
      userId: req.user.userId, 
      correlationId 
    });

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Message processing failed',
        message: error.message
      });
    }
  }
});

// Get session history
router.get('/sessions', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const sessions = await Session.find({ 
      userId, 
      isActive: true 
    })
    .sort({ lastActivityAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .select('-__v');

    res.json({
      sessions,
      total: await Session.countDocuments({ userId, isActive: true })
    });

  } catch (error) {
    observability.error('Failed to get sessions', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to get sessions',
      message: error.message
    });
  }
});

// Get session messages
router.get('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { limit = 50 } = req.query;

    // Verify session ownership
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }

    const messages = await Message.getConversationHistory(sessionId, parseInt(limit));

    res.json({
      sessionId,
      messages,
      session: {
        title: session.title,
        provider: session.provider,
        model: session.model,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt
      }
    });

  } catch (error) {
    observability.error('Failed to get messages', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message
    });
  }
});

// Clear session context
router.delete('/sessions/:sessionId/context', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session ownership
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }

    const result = await contextManager.clearContext(sessionId);

    observability.info('Session context cleared', {
      sessionId,
      userId,
      correlationId
    });

    res.json({
      message: 'Context cleared successfully',
      result
    });

  } catch (error) {
    observability.error('Failed to clear context', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to clear context',
      message: error.message
    });
  }
});

// Summarize session context
router.post('/sessions/:sessionId/summarize', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session ownership
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }

    const result = await contextManager.summarizeContext(sessionId);

    observability.info('Session context summarized', {
      sessionId,
      userId,
      result,
      correlationId
    });

    res.json({
      message: 'Context summarized successfully',
      result
    });

  } catch (error) {
    observability.error('Failed to summarize context', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to summarize context',
      message: error.message
    });
  }
});

// Export conversation
router.get('/sessions/:sessionId/export', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { format = 'json' } = req.query;

    // Verify session ownership
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }

    const messages = await Message.exportConversation(sessionId, format);

    const exportData = {
      sessionId,
      title: session.title,
      provider: session.provider,
      model: session.model,
      createdAt: session.createdAt,
      exportedAt: new Date().toISOString(),
      messages
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chat-${sessionId}.json"`);
      res.json(exportData);
    } else {
      // Plain text format
      const textContent = messages
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="chat-${sessionId}.txt"`);
      res.send(textContent);
    }

    observability.info('Conversation exported', {
      sessionId,
      userId,
      format,
      messageCount: messages.length,
      correlationId
    });

  } catch (error) {
    observability.error('Failed to export conversation', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to export conversation',
      message: error.message
    });
  }
});

// SSE streaming endpoint
router.get('/stream/:sessionId', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session ownership
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      sessionId,
      message: 'Stream connected' 
    })}\n\n`);

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      observability.info('SSE connection closed', { sessionId, userId, correlationId });
    });

    // Store the response object for this session (in a real app, use Redis or similar)
    // For now, we'll just keep the connection open
    
  } catch (error) {
    observability.error('Failed to establish SSE connection', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to establish stream',
      message: error.message
    });
  }
});

// Get context stats
router.get('/sessions/:sessionId/stats', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    // Verify session ownership
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }

    const stats = await contextManager.getContextStats(sessionId);

    res.json(stats);

  } catch (error) {
    observability.error('Failed to get context stats', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to get context stats',
      message: error.message
    });
  }
});

module.exports = router;