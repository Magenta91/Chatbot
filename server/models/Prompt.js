const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['system', 'user', 'assistant', 'summarization', 'safety'],
    default: 'user'
  },
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'array'],
      default: 'string'
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: mongoose.Schema.Types.Mixed
  }],
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usage: {
    totalUses: {
      type: Number,
      default: 0
    },
    lastUsedAt: Date,
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
promptSchema.index({ name: 1 });
promptSchema.index({ category: 1, isPublic: 1 });
promptSchema.index({ createdBy: 1, isActive: 1 });
promptSchema.index({ tags: 1 });
promptSchema.index({ 'usage.totalUses': -1 });

// Static method to get system prompts
promptSchema.statics.getSystemPrompts = function() {
  return this.find({ 
    category: 'system', 
    isActive: true 
  }).select('name description content');
};

// Static method to get summarization prompt
promptSchema.statics.getSummarizationPrompt = function() {
  return this.findOne({ 
    category: 'summarization', 
    isActive: true 
  }).select('content');
};

// Static method to get public prompts
promptSchema.statics.getPublicPrompts = function(category = null, limit = 50) {
  const query = { isPublic: true, isActive: true };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ 'usage.totalUses': -1, createdAt: -1 })
    .limit(limit)
    .select('-__v');
};

// Static method to search prompts
promptSchema.statics.searchPrompts = function(searchTerm, userId = null) {
  const query = {
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  
  // Include user's private prompts or public prompts
  if (userId) {
    query.$or = [
      { ...query, createdBy: userId },
      { ...query, isPublic: true }
    ];
    delete query.isActive; // Remove duplicate condition
    query.isActive = true;
  } else {
    query.isPublic = true;
  }
  
  return this.find(query)
    .sort({ 'usage.totalUses': -1 })
    .select('-__v');
};

// Instance method to render prompt with variables
promptSchema.methods.render = function(variables = {}) {
  let rendered = this.content;
  
  // Replace variables in the format {{variableName}}
  this.variables.forEach(variable => {
    const placeholder = `{{${variable.name}}}`;
    const value = variables[variable.name] || variable.defaultValue || '';
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return rendered;
};

// Instance method to increment usage
promptSchema.methods.incrementUsage = function() {
  this.usage.totalUses += 1;
  this.usage.lastUsedAt = new Date();
  return this.save();
};

// Instance method to add rating
promptSchema.methods.addRating = function(rating) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  
  const currentTotal = this.usage.avgRating * this.usage.ratingCount;
  this.usage.ratingCount += 1;
  this.usage.avgRating = (currentTotal + rating) / this.usage.ratingCount;
  
  return this.save();
};

// Pre-save middleware to validate variables in content
promptSchema.pre('save', function(next) {
  const variableNames = this.variables.map(v => v.name);
  const contentVariables = (this.content.match(/\{\{(\w+)\}\}/g) || [])
    .map(match => match.replace(/[{}]/g, ''));
  
  // Check for undefined variables in content
  const undefinedVars = contentVariables.filter(v => !variableNames.includes(v));
  if (undefinedVars.length > 0) {
    return next(new Error(`Undefined variables in content: ${undefinedVars.join(', ')}`));
  }
  
  next();
});

module.exports = mongoose.model('Prompt', promptSchema);