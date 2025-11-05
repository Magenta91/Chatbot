const Joi = require('joi');
const config = require('../config');

class SafetyService {
  constructor() {
    this.profanityWords = [
      // Very minimal list - only extreme cases
      // Most words removed for normal chat usage
    ];
    
    this.promptInjectionPatterns = [
      // Very specific patterns only - most removed for normal chat
      /ignore\s+all\s+previous\s+instructions\s+and/i,
      /system\s*:\s*ignore\s+safety/i,
      /\<\|system\|\>\s*ignore/i,
      /override\s+all\s+safety\s+protocols/i
    ];

    this.messageSchema = Joi.object({
      content: Joi.string().min(1).max(4000).required(),
      role: Joi.string().valid('user', 'assistant', 'system').required(),
      sessionId: Joi.string().uuid().required()
    });

    this.sessionSchema = Joi.object({
      provider: Joi.string().valid('openai', 'dialogflow', 'mock').required(),
      model: Joi.string().max(100),
      temperature: Joi.number().min(0).max(2),
      maxTokens: Joi.number().min(1).max(4000),
      systemPrompt: Joi.string().max(2000).allow('')
    });
  }

  validateMessage(messageData) {
    const { error, value } = this.messageSchema.validate(messageData);
    
    if (error) {
      throw new Error(`Message validation failed: ${error.details[0].message}`);
    }

    return value;
  }

  validateSession(sessionData) {
    const { error, value } = this.sessionSchema.validate(sessionData);
    
    if (error) {
      throw new Error(`Session validation failed: ${error.details[0].message}`);
    }

    return value;
  }

  checkProfanity(text) {
    if (!config.safety.enableProfanityFilter) {
      return { flagged: false, flags: [], confidence: 0 };
    }

    const lowerText = text.toLowerCase();
    const foundWords = [];
    
    for (const word of this.profanityWords) {
      if (lowerText.includes(word)) {
        foundWords.push(word);
      }
    }

    return {
      flagged: foundWords.length > 0,
      flags: foundWords.map(word => `profanity:${word}`),
      confidence: foundWords.length > 0 ? 0.8 : 0
    };
  }

  checkPromptInjection(text) {
    if (!config.safety.enablePromptInjectionDetection) {
      return { flagged: false, flags: [], confidence: 0 };
    }

    const flags = [];
    
    for (const pattern of this.promptInjectionPatterns) {
      if (pattern.test(text)) {
        flags.push(`prompt-injection:${pattern.source.substring(0, 20)}`);
      }
    }

    // Additional heuristics - much more lenient
    const suspiciousPatterns = [
      text.includes('```') && text.includes('system') && text.includes('ignore all'),
      text.split('\n').length > 20 && text.includes('ignore all previous'),
      text.length > 2000 && /ignore\s+all\s+previous\s+instructions/i.test(text)
    ];

    const suspiciousCount = suspiciousPatterns.filter(Boolean).length;
    if (suspiciousCount > 1) { // Require multiple suspicious patterns
      flags.push(`suspicious-structure:${suspiciousCount}`);
    }

    return {
      flagged: flags.length > 0,
      flags,
      confidence: Math.min(flags.length * 0.3, 1.0)
    };
  }

  checkContentSafety(text) {
    // Skip safety checks for short, normal messages
    if (text.length < 500 && !text.includes('system') && !text.includes('ignore')) {
      return {
        flagged: false,
        flags: [],
        confidence: 0,
        details: {
          profanity: { flagged: false, flags: [], confidence: 0 },
          promptInjection: { flagged: false, flags: [], confidence: 0 }
        }
      };
    }

    const profanityCheck = this.checkProfanity(text);
    const injectionCheck = this.checkPromptInjection(text);
    
    const allFlags = [...profanityCheck.flags, ...injectionCheck.flags];
    const maxConfidence = Math.max(profanityCheck.confidence, injectionCheck.confidence);
    
    return {
      flagged: profanityCheck.flagged || injectionCheck.flagged,
      flags: allFlags,
      confidence: maxConfidence,
      details: {
        profanity: profanityCheck,
        promptInjection: injectionCheck
      }
    };
  }

  sanitizeInput(text) {
    // Basic input sanitization
    return text
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 4000); // Truncate if too long
  }

  generateSafeResponse(error, context = {}) {
    const safeResponses = {
      'profanity': 'I notice your message contains inappropriate language. Please rephrase your question respectfully.',
      'prompt-injection': 'I detected an attempt to modify my instructions. Please ask your question directly.',
      'rate-limit': 'You\'ve reached the rate limit. Please wait before sending another message.',
      'validation': 'Your message format is invalid. Please check your input and try again.',
      'provider-error': 'I\'m experiencing technical difficulties. Please try again in a moment.',
      'quota-exceeded': 'You\'ve reached your usage quota. Please try again later or upgrade your plan.',
      'default': 'I\'m sorry, but I can\'t process your request right now. Please try rephrasing or contact support.'
    };

    const errorType = this.categorizeError(error);
    const response = safeResponses[errorType] || safeResponses.default;
    
    return {
      text: response,
      error: true,
      errorType,
      retryable: ['provider-error', 'rate-limit'].includes(errorType),
      context
    };
  }

  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('profanity') || message.includes('inappropriate')) {
      return 'profanity';
    }
    if (message.includes('injection') || message.includes('instruction')) {
      return 'prompt-injection';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'rate-limit';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return 'quota-exceeded';
    }
    if (message.includes('api') || message.includes('provider')) {
      return 'provider-error';
    }
    
    return 'default';
  }

  // Content moderation for responses
  moderateResponse(text, context = {}) {
    // Check if response contains sensitive information
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/ // Phone numbers
    ];

    const flags = [];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(text)) {
        flags.push('sensitive-data');
        break;
      }
    }

    // Check for potential harmful instructions
    const harmfulPatterns = [
      /how\s+to\s+(make|create|build).*(bomb|weapon|drug)/i,
      /suicide|self.harm|kill.yourself/i,
      /hack|crack|exploit.*password/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(text)) {
        flags.push('harmful-content');
        break;
      }
    }

    return {
      flagged: flags.length > 0,
      flags,
      confidence: flags.length > 0 ? 0.9 : 0,
      safe: flags.length === 0
    };
  }

  // Rate limiting check integration
  async checkUserSafety(userId, action = 'message') {
    // This could integrate with external safety APIs
    // For now, return a simple check
    return {
      allowed: true,
      reason: null,
      restrictions: []
    };
  }

  // Log safety events
  logSafetyEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getSeverity(event)
    };

    console.log('Safety Event:', JSON.stringify(logEntry));
    
    // In production, send to monitoring system
    return logEntry;
  }

  getSeverity(event) {
    const severityMap = {
      'profanity': 'low',
      'prompt-injection': 'high',
      'sensitive-data': 'high',
      'harmful-content': 'critical',
      'rate-limit': 'medium',
      'validation': 'low'
    };

    return severityMap[event] || 'medium';
  }
}

module.exports = new SafetyService();