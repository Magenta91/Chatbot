const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'summary'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    provider: String,
    model: String,
    tokenCount: {
      type: Number,
      default: 0
    },
    usage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number
    },
    responseTime: Number, // milliseconds
    confidence: Number,
    intent: String, // for Dialogflow
    messageId: String, // provider-specific ID
    parentMessageId: String, // for threading
    isStreaming: {
      type: Boolean,
      default: false
    },
    streamingComplete: {
      type: Boolean,
      default: true
    }
  },
  safety: {
    flagged: {
      type: Boolean,
      default: false
    },
    flags: [String], // profanity, prompt-injection, etc.
    confidence: Number
  },
  status: {
    type: String,
    enum: ['pending', 'streaming', 'completed', 'error', 'cancelled'],
    default: 'completed'
  },
  error: {
    message: String,
    code: String,
    retryable: Boolean
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ sessionId: 1, createdAt: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ sessionId: 1, role: 1, createdAt: 1 });

// TTL index for automatic cleanup (inherits from session TTL)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

// Estimate token count if not provided
messageSchema.pre('save', function(next) {
  if (!this.metadata.tokenCount && this.content) {
    // Rough estimation: ~4 characters per token
    this.metadata.tokenCount = Math.ceil(this.content.length / 4);
  }
  next();
});

// Static method to get conversation history
messageSchema.statics.getConversationHistory = function(sessionId, limit = 50) {
  return this.find({ sessionId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('-__v');
};

// Static method to get messages for summarization
messageSchema.statics.getMessagesForSummarization = function(sessionId, beforeDate) {
  const query = { sessionId, role: { $in: ['user', 'assistant'] } };
  if (beforeDate) {
    query.createdAt = { $lt: beforeDate };
  }
  
  return this.find(query)
    .sort({ createdAt: 1 })
    .select('role content metadata.tokenCount createdAt');
};

// Static method to replace messages with summary
messageSchema.statics.replaceWithSummary = async function(sessionId, messageIds, summaryContent, summaryHash) {
  // Delete old messages
  await this.deleteMany({ 
    sessionId, 
    _id: { $in: messageIds } 
  });
  
  // Create summary message
  return this.create({
    sessionId,
    userId: messageIds[0]?.userId, // Assume same user for session
    role: 'summary',
    content: summaryContent,
    metadata: {
      tokenCount: Math.ceil(summaryContent.length / 4),
      summaryHash,
      originalMessageCount: messageIds.length
    }
  });
};

// Static method to get token usage for a session
messageSchema.statics.getSessionTokenUsage = function(sessionId) {
  return this.aggregate([
    { $match: { sessionId } },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$metadata.tokenCount' },
        messageCount: { $sum: 1 },
        userMessages: {
          $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
        },
        assistantMessages: {
          $sum: { $cond: [{ $eq: ['$role', 'assistant'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to export conversation
messageSchema.statics.exportConversation = function(sessionId, format = 'json') {
  return this.find({ sessionId })
    .sort({ createdAt: 1 })
    .select('role content createdAt metadata.provider metadata.model')
    .lean();
};

// Instance method to mark as streaming
messageSchema.methods.startStreaming = function() {
  this.status = 'streaming';
  this.metadata.isStreaming = true;
  this.metadata.streamingComplete = false;
  return this.save();
};

// Instance method to complete streaming
messageSchema.methods.completeStreaming = function() {
  this.status = 'completed';
  this.metadata.isStreaming = false;
  this.metadata.streamingComplete = true;
  return this.save();
};

// Instance method to mark as error
messageSchema.methods.markError = function(error) {
  this.status = 'error';
  this.error = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    retryable: error.retryable || false
  };
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);