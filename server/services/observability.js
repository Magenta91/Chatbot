const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class ObservabilityService {
  constructor() {
    this.metrics = new Map();
    this.correlationStore = new Map();
    this.initLogger();
    this.initMetrics();
  }

  initLogger() {
    this.logger = winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, correlationId, userId, sessionId, ...meta }) => {
          const logEntry = {
            timestamp,
            level,
            message,
            correlationId,
            userId,
            sessionId,
            ...meta
          };
          
          // Redact sensitive information
          return JSON.stringify(this.redactSensitiveData(logEntry));
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      ]
    });
  }

  initMetrics() {
    this.metricsData = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byProvider: new Map(),
        byEndpoint: new Map()
      },
      latency: {
        total: [],
        byProvider: new Map(),
        byEndpoint: new Map()
      },
      tokens: {
        total: 0,
        byProvider: new Map(),
        byUser: new Map()
      },
      errors: {
        total: 0,
        byType: new Map(),
        byProvider: new Map()
      },
      sessions: {
        active: 0,
        total: 0,
        avgDuration: 0
      }
    };

    // Clean up old metrics every hour
    setInterval(() => this.cleanupMetrics(), 3600000);
  }

  generateCorrelationId() {
    return uuidv4();
  }

  setCorrelationContext(correlationId, context) {
    this.correlationStore.set(correlationId, {
      ...context,
      createdAt: Date.now()
    });
  }

  getCorrelationContext(correlationId) {
    return this.correlationStore.get(correlationId);
  }

  log(level, message, meta = {}) {
    const logData = {
      ...meta,
      correlationId: meta.correlationId || this.generateCorrelationId()
    };

    this.logger.log(level, message, logData);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  error(message, error, meta = {}) {
    const errorMeta = {
      ...meta,
      error: {
        message: error?.message,
        stack: error?.stack,
        code: error?.code
      }
    };
    this.log('error', message, errorMeta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Metrics collection
  recordRequest(endpoint, provider, success = true, latency = 0, correlationId) {
    this.metricsData.requests.total++;
    
    if (success) {
      this.metricsData.requests.success++;
    } else {
      this.metricsData.requests.error++;
    }

    // By provider
    if (!this.metricsData.requests.byProvider.has(provider)) {
      this.metricsData.requests.byProvider.set(provider, { total: 0, success: 0, error: 0 });
    }
    const providerStats = this.metricsData.requests.byProvider.get(provider);
    providerStats.total++;
    if (success) providerStats.success++;
    else providerStats.error++;

    // By endpoint
    if (!this.metricsData.requests.byEndpoint.has(endpoint)) {
      this.metricsData.requests.byEndpoint.set(endpoint, { total: 0, success: 0, error: 0 });
    }
    const endpointStats = this.metricsData.requests.byEndpoint.get(endpoint);
    endpointStats.total++;
    if (success) endpointStats.success++;
    else endpointStats.error++;

    // Record latency
    this.recordLatency(endpoint, provider, latency);

    this.info('Request recorded', {
      endpoint,
      provider,
      success,
      latency,
      correlationId
    });
  }

  recordLatency(endpoint, provider, latency) {
    // Overall latency
    this.metricsData.latency.total.push({
      value: latency,
      timestamp: Date.now()
    });

    // By provider
    if (!this.metricsData.latency.byProvider.has(provider)) {
      this.metricsData.latency.byProvider.set(provider, []);
    }
    this.metricsData.latency.byProvider.get(provider).push({
      value: latency,
      timestamp: Date.now()
    });

    // By endpoint
    if (!this.metricsData.latency.byEndpoint.has(endpoint)) {
      this.metricsData.latency.byEndpoint.set(endpoint, []);
    }
    this.metricsData.latency.byEndpoint.get(endpoint).push({
      value: latency,
      timestamp: Date.now()
    });
  }

  recordTokenUsage(provider, userId, tokens, correlationId) {
    this.metricsData.tokens.total += tokens;

    // By provider
    if (!this.metricsData.tokens.byProvider.has(provider)) {
      this.metricsData.tokens.byProvider.set(provider, 0);
    }
    this.metricsData.tokens.byProvider.set(
      provider,
      this.metricsData.tokens.byProvider.get(provider) + tokens
    );

    // By user
    if (!this.metricsData.tokens.byUser.has(userId)) {
      this.metricsData.tokens.byUser.set(userId, 0);
    }
    this.metricsData.tokens.byUser.set(
      userId,
      this.metricsData.tokens.byUser.get(userId) + tokens
    );

    this.info('Token usage recorded', {
      provider,
      userId,
      tokens,
      correlationId
    });
  }

  recordError(type, provider, error, correlationId) {
    this.metricsData.errors.total++;

    // By type
    if (!this.metricsData.errors.byType.has(type)) {
      this.metricsData.errors.byType.set(type, 0);
    }
    this.metricsData.errors.byType.set(
      type,
      this.metricsData.errors.byType.get(type) + 1
    );

    // By provider
    if (provider) {
      if (!this.metricsData.errors.byProvider.has(provider)) {
        this.metricsData.errors.byProvider.set(provider, 0);
      }
      this.metricsData.errors.byProvider.set(
        provider,
        this.metricsData.errors.byProvider.get(provider) + 1
      );
    }

    this.error('Error recorded', error, {
      type,
      provider,
      correlationId
    });
  }

  recordSession(action, sessionId, userId, correlationId) {
    if (action === 'start') {
      this.metricsData.sessions.active++;
      this.metricsData.sessions.total++;
    } else if (action === 'end') {
      this.metricsData.sessions.active = Math.max(0, this.metricsData.sessions.active - 1);
    }

    this.info('Session recorded', {
      action,
      sessionId,
      userId,
      activeSessions: this.metricsData.sessions.active,
      correlationId
    });
  }

  // Get metrics for monitoring endpoint
  getMetrics() {
    const now = Date.now();
    const oneHour = 3600000;

    return {
      timestamp: new Date().toISOString(),
      requests: {
        total: this.metricsData.requests.total,
        success: this.metricsData.requests.success,
        error: this.metricsData.requests.error,
        successRate: this.metricsData.requests.total > 0 
          ? (this.metricsData.requests.success / this.metricsData.requests.total * 100).toFixed(2)
          : 0,
        byProvider: Object.fromEntries(this.metricsData.requests.byProvider),
        byEndpoint: Object.fromEntries(this.metricsData.requests.byEndpoint)
      },
      latency: {
        avg: this.calculateAverageLatency(this.metricsData.latency.total),
        p95: this.calculatePercentile(this.metricsData.latency.total, 95),
        p99: this.calculatePercentile(this.metricsData.latency.total, 99),
        byProvider: this.getLatencyByCategory(this.metricsData.latency.byProvider),
        byEndpoint: this.getLatencyByCategory(this.metricsData.latency.byEndpoint)
      },
      tokens: {
        total: this.metricsData.tokens.total,
        byProvider: Object.fromEntries(this.metricsData.tokens.byProvider),
        topUsers: this.getTopTokenUsers()
      },
      errors: {
        total: this.metricsData.errors.total,
        rate: this.metricsData.requests.total > 0 
          ? (this.metricsData.errors.total / this.metricsData.requests.total * 100).toFixed(2)
          : 0,
        byType: Object.fromEntries(this.metricsData.errors.byType),
        byProvider: Object.fromEntries(this.metricsData.errors.byProvider)
      },
      sessions: {
        active: this.metricsData.sessions.active,
        total: this.metricsData.sessions.total
      }
    };
  }

  calculateAverageLatency(latencyArray) {
    if (latencyArray.length === 0) return 0;
    const sum = latencyArray.reduce((acc, item) => acc + item.value, 0);
    return (sum / latencyArray.length).toFixed(2);
  }

  calculatePercentile(latencyArray, percentile) {
    if (latencyArray.length === 0) return 0;
    const sorted = latencyArray.map(item => item.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getLatencyByCategory(categoryMap) {
    const result = {};
    for (const [category, latencyArray] of categoryMap) {
      result[category] = {
        avg: this.calculateAverageLatency(latencyArray),
        p95: this.calculatePercentile(latencyArray, 95)
      };
    }
    return result;
  }

  getTopTokenUsers(limit = 10) {
    return Array.from(this.metricsData.tokens.byUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, tokens]) => ({ userId, tokens }));
  }

  // Middleware for Express
  createMiddleware() {
    return (req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      const startTime = Date.now();

      req.correlationId = correlationId;
      req.startTime = startTime;

      // Set correlation context
      this.setCorrelationContext(correlationId, {
        userId: req.user?.id,
        sessionId: req.body?.sessionId || req.query?.sessionId,
        endpoint: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(data) {
        const latency = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        // Record metrics
        req.observability?.recordRequest(
          req.path,
          req.body?.provider || 'unknown',
          success,
          latency,
          correlationId
        );

        return originalJson.call(this, data);
      };

      // Add observability to request
      req.observability = this;

      next();
    };
  }

  redactSensitiveData(data) {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const redacted = { ...data };

    for (const key of sensitiveKeys) {
      if (redacted[key]) {
        redacted[key] = '[REDACTED]';
      }
    }

    // Redact in nested objects
    for (const [key, value] of Object.entries(redacted)) {
      if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactSensitiveData(value);
      }
    }

    return redacted;
  }

  cleanupMetrics() {
    const oneHour = 3600000;
    const cutoff = Date.now() - oneHour;

    // Clean up latency data older than 1 hour
    this.metricsData.latency.total = this.metricsData.latency.total
      .filter(item => item.timestamp > cutoff);

    for (const [key, latencyArray] of this.metricsData.latency.byProvider) {
      this.metricsData.latency.byProvider.set(
        key,
        latencyArray.filter(item => item.timestamp > cutoff)
      );
    }

    for (const [key, latencyArray] of this.metricsData.latency.byEndpoint) {
      this.metricsData.latency.byEndpoint.set(
        key,
        latencyArray.filter(item => item.timestamp > cutoff)
      );
    }

    // Clean up correlation store
    for (const [correlationId, context] of this.correlationStore) {
      if (context.createdAt < cutoff) {
        this.correlationStore.delete(correlationId);
      }
    }

    this.debug('Metrics cleanup completed');
  }
}

module.exports = new ObservabilityService();