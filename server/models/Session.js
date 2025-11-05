const mongoose = require('mongoose');
const config = require('../config');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  provider: {
    type: String,
    default: 'openai'
  },
  model: {
    type: String,
    default: 'gpt-4o-mini'
  },
  systemPrompt: {
    type: String,
    default: ''
  },
  settings: {
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      default: 1000
    }
  },
  context: {
    totalTokens: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    lastSummarizedAt: Date,
    summaryHash: String
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    tags: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// TTL index for automatic cleanup of inactive sessions
sessionSchema.index(
  { lastActivityAt: 1 }, 
  { 
    expireAfterSeconds: config.sessionTtlDays * 24 * 60 * 60,
    partialFilterExpression: { isActive: true }
  }
);

// Compound indexes for efficient queries
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, isActive: 1, lastActivityAt: -1 });

// Update last activity timestamp
sessionSchema.methods.updateActivity = function() {
  this.lastActivityAt = new Date();
  return this.save();
};

// Update context statistics
sessionSchema.methods.updateContext = function(tokenDelta = 0, messageDelta = 0) {
  this.context.totalTokens += tokenDelta;
  this.context.messageCount += messageDelta;
  this.lastActivityAt = new Date();
};

// Check if session needs summarization
sessionSchema.methods.needsSummarization = function() {
  return this.context.totalTokens > config.summarizationThreshold;
};

// Generate a title from the first user message
sessionSchema.methods.generateTitle = function(firstMessage) {
  if (firstMessage && firstMessage.length > 0) {
    // Take first 50 characters and add ellipsis if longer
    const title = firstMessage.substring(0, 50);
    this.title = title.length < firstMessage.length ? title + '...' : title;
  }
};

// Deactivate session
sessionSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Static method to find active sessions for a user
sessionSchema.statics.findActiveByUser = function(userId, limit = 20) {
  return this.find({ 
    userId, 
    isActive: true 
  })
  .sort({ lastActivityAt: -1 })
  .limit(limit)
  .select('-__v');
};

// Static method to cleanup old inactive sessions
sessionSchema.statics.cleanupInactive = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    isActive: false,
    lastActivityAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('Session', sessionSchema);