const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  preferences: {
    defaultProvider: {
      type: String,
      default: 'openai' // Use OpenAI with free tier models
    },
    defaultModel: {
      type: String,
      default: 'gpt-4o-mini' // Free tier model
    },
    defaultTemperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    systemPrompt: {
      type: String,
      default: ''
    }
  },
  usage: {
    totalTokens: {
      type: Number,
      default: 0
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    lastRequestAt: Date
  },
  quotas: {
    dailyTokenLimit: {
      type: Number,
      default: 100000 // Increased for free tier
    },
    dailyRequestLimit: {
      type: Number,
      default: 1000 // Increased for free tier
    },
    resetDate: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Reset daily quotas if needed
userSchema.methods.checkAndResetQuotas = function() {
  const now = new Date();
  const resetDate = new Date(this.quotas.resetDate);
  
  // Reset if it's a new day
  if (now.toDateString() !== resetDate.toDateString()) {
    this.usage.totalTokens = 0;
    this.usage.totalRequests = 0;
    this.quotas.resetDate = now;
  }
};

// Check if user has exceeded quotas
userSchema.methods.hasExceededQuotas = function() {
  this.checkAndResetQuotas();
  
  return (
    this.usage.totalTokens >= this.quotas.dailyTokenLimit ||
    this.usage.totalRequests >= this.quotas.dailyRequestLimit
  );
};

// Update usage statistics
userSchema.methods.updateUsage = function(tokens = 0) {
  this.checkAndResetQuotas();
  this.usage.totalTokens += tokens;
  this.usage.totalRequests += 1;
  this.usage.lastRequestAt = new Date();
};

module.exports = mongoose.model('User', userSchema);