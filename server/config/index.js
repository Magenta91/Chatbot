require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ai-chat-platform',
  redisUrl: process.env.REDIS_URL,

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  jwtExpiresIn: '24h',

  // AI Providers
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini', // Free tier model
    maxTokens: 500, // Reduced for free tier efficiency
    temperature: 0.7,
    // Free tier specific settings
    freeTierModels: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    maxTokensFreeTier: 500,
    requestsPerMinute: 3 // Free tier limit
  },
  
  dialogflow: {
    projectId: process.env.DIALOGFLOW_PROJECT_ID,
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
  },

  // Feature Flags
  useDialogflow: process.env.USE_DIALOGFLOW === 'true',
  summarizationModel: process.env.SUMMARIZATION_MODEL || 'gpt-4o-mini',

  // Session Management
  sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS) || 30,
  maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS) || 4000,
  summarizationThreshold: parseInt(process.env.SUMMARIZATION_THRESHOLD) || 3000,

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Safety - Disabled by default for normal chat usage
  safety: {
    enableProfanityFilter: process.env.ENABLE_PROFANITY_FILTER === 'true',
    enablePromptInjectionDetection: process.env.ENABLE_PROMPT_INJECTION_DETECTION === 'true'
  },

  // Observability
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  enableMetrics: process.env.ENABLE_METRICS !== 'false'
};

module.exports = config;