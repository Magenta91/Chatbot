const redis = require('redis');
const config = require('../config');

class RateLimiter {
  constructor() {
    this.redisClient = null;
    this.inMemoryStore = new Map();
    this.initRedis();
  }

  async initRedis() {
    if (config.redisUrl) {
      try {
        this.redisClient = redis.createClient({ url: config.redisUrl });
        await this.redisClient.connect();
        console.log('Redis connected for rate limiting');
      } catch (error) {
        console.warn('Redis connection failed, using in-memory rate limiting:', error.message);
        this.redisClient = null;
      }
    }
  }

  async checkRateLimit(key, windowMs = config.rateLimit.windowMs, maxRequests = config.rateLimit.maxRequests) {
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      if (this.redisClient) {
        return await this._checkRedisRateLimit(key, windowStart, now, maxRequests);
      } else {
        return await this._checkInMemoryRateLimit(key, windowStart, now, maxRequests);
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
    }
  }

  async _checkRedisRateLimit(key, windowStart, now, maxRequests) {
    const pipeline = this.redisClient.multi();
    
    // Remove old entries
    pipeline.zRemRangeByScore(key, 0, windowStart);
    
    // Count current requests
    pipeline.zCard(key);
    
    // Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    
    // Set expiration
    pipeline.expire(key, Math.ceil((now - windowStart) / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results[1][1] + 1; // +1 for the request we just added
    
    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);
    const resetTime = now + (windowStart + (maxRequests > 0 ? Math.ceil(windowStart / maxRequests) : 0));

    return {
      allowed,
      remaining,
      resetTime,
      total: maxRequests,
      current: currentCount
    };
  }

  async _checkInMemoryRateLimit(key, windowStart, now, maxRequests) {
    // Clean up old entries periodically
    this._cleanupInMemoryStore(windowStart);

    if (!this.inMemoryStore.has(key)) {
      this.inMemoryStore.set(key, []);
    }

    const requests = this.inMemoryStore.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Add current request
    validRequests.push(now);
    
    // Update store
    this.inMemoryStore.set(key, validRequests);

    const currentCount = validRequests.length;
    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);
    const resetTime = now + (windowStart + (maxRequests > 0 ? Math.ceil(windowStart / maxRequests) : 0));

    return {
      allowed,
      remaining,
      resetTime,
      total: maxRequests,
      current: currentCount
    };
  }

  _cleanupInMemoryStore(windowStart) {
    // Clean up every 100 checks to avoid memory leaks
    if (Math.random() < 0.01) {
      for (const [key, requests] of this.inMemoryStore.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        if (validRequests.length === 0) {
          this.inMemoryStore.delete(key);
        } else {
          this.inMemoryStore.set(key, validRequests);
        }
      }
    }
  }

  // User-specific rate limiting
  async checkUserRateLimit(userId, windowMs, maxRequests) {
    return this.checkRateLimit(`user:${userId}`, windowMs, maxRequests);
  }

  // IP-based rate limiting
  async checkIPRateLimit(ip, windowMs, maxRequests) {
    return this.checkRateLimit(`ip:${ip}`, windowMs, maxRequests);
  }

  // API key rate limiting
  async checkAPIKeyRateLimit(apiKey, windowMs, maxRequests) {
    return this.checkRateLimit(`api:${apiKey}`, windowMs, maxRequests);
  }

  // Token usage rate limiting
  async checkTokenRateLimit(userId, tokens, windowMs = 3600000, maxTokens = 10000) {
    const key = `tokens:${userId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      if (this.redisClient) {
        return await this._checkRedisTokenLimit(key, windowStart, now, tokens, maxTokens);
      } else {
        return await this._checkInMemoryTokenLimit(key, windowStart, now, tokens, maxTokens);
      }
    } catch (error) {
      console.error('Token rate limit check failed:', error);
      return { allowed: true, remaining: maxTokens, resetTime: now + windowMs };
    }
  }

  async _checkRedisTokenLimit(key, windowStart, now, tokens, maxTokens) {
    const pipeline = this.redisClient.multi();
    
    // Get current token usage in window
    pipeline.get(`${key}:count`);
    
    const results = await pipeline.exec();
    const currentTokens = parseInt(results[0][1] || '0');
    const newTotal = currentTokens + tokens;
    
    const allowed = newTotal <= maxTokens;
    
    if (allowed) {
      // Update token count
      await this.redisClient.setEx(`${key}:count`, Math.ceil(windowStart / 1000), newTotal.toString());
    }

    return {
      allowed,
      remaining: Math.max(0, maxTokens - newTotal),
      resetTime: now + windowStart,
      total: maxTokens,
      current: newTotal
    };
  }

  async _checkInMemoryTokenLimit(key, windowStart, now, tokens, maxTokens) {
    const tokenKey = `${key}:tokens`;
    
    if (!this.inMemoryStore.has(tokenKey)) {
      this.inMemoryStore.set(tokenKey, { count: 0, resetTime: now + windowStart });
    }

    const tokenData = this.inMemoryStore.get(tokenKey);
    
    // Reset if window expired
    if (now > tokenData.resetTime) {
      tokenData.count = 0;
      tokenData.resetTime = now + windowStart;
    }

    const newTotal = tokenData.count + tokens;
    const allowed = newTotal <= maxTokens;
    
    if (allowed) {
      tokenData.count = newTotal;
      this.inMemoryStore.set(tokenKey, tokenData);
    }

    return {
      allowed,
      remaining: Math.max(0, maxTokens - newTotal),
      resetTime: tokenData.resetTime,
      total: maxTokens,
      current: newTotal
    };
  }

  // Middleware factory for Express
  createMiddleware(options = {}) {
    const {
      windowMs = config.rateLimit.windowMs,
      maxRequests = config.rateLimit.maxRequests,
      keyGenerator = (req) => req.ip,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
      try {
        const key = keyGenerator(req);
        const result = await this.checkRateLimit(key, windowMs, maxRequests);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.total,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        if (!result.allowed) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        next(); // Fail open
      }
    };
  }

  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = new RateLimiter();