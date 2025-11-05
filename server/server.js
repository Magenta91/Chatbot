const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const config = require('./config');
const { router: authRoutes } = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const observability = require('./services/observability');
const rateLimiter = require('./services/rateLimiter');
const providerManager = require('./providers');

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws/chat'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Observability middleware
app.use(observability.createMiddleware());

// Global rate limiting
app.use(rateLimiter.createMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // Global limit
  keyGenerator: (req) => req.ip
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check providers
    const providerStatus = await providerManager.testAllProviders();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbStatus,
      providers: providerStatus,
      uptime: process.uptime()
    };

    res.json(health);
  } catch (error) {
    observability.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  if (!config.enableMetrics) {
    return res.status(404).json({ error: 'Metrics disabled' });
  }

  try {
    const metrics = observability.getMetrics();
    res.json(metrics);
  } catch (error) {
    observability.error('Failed to get metrics', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Provider status endpoint
app.get('/api/v1/providers', async (req, res) => {
  try {
    const providers = providerManager.getAvailableProviders();
    const status = await providerManager.testAllProviders();
    
    res.json({
      available: providers,
      status
    });
  } catch (error) {
    observability.error('Failed to get provider status', error);
    res.status(500).json({ error: 'Failed to get provider status' });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const correlationId = observability.generateCorrelationId();
  
  observability.info('WebSocket connection established', { correlationId });

  // Authenticate WebSocket connection
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        // Authenticate with JWT token
        try {
          const decoded = jwt.verify(data.token, config.jwtSecret);
          ws.userId = decoded.userId;
          ws.authenticated = true;
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            correlationId
          }));
          
          observability.info('WebSocket authenticated', { 
            userId: ws.userId, 
            correlationId 
          });
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Invalid token'
          }));
          ws.close();
        }
      } else if (data.type === 'chat' && ws.authenticated) {
        // Handle chat message via WebSocket
        await handleWebSocketChat(ws, data, correlationId);
      } else if (data.type === 'ping') {
        // Heartbeat
        ws.send(JSON.stringify({ type: 'pong' }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message type or not authenticated'
        }));
      }
    } catch (error) {
      observability.error('WebSocket message error', error, { correlationId });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    observability.info('WebSocket connection closed', { 
      userId: ws.userId, 
      correlationId 
    });
  });

  ws.on('error', (error) => {
    observability.error('WebSocket error', error, { 
      userId: ws.userId, 
      correlationId 
    });
  });

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established',
    correlationId
  }));
});

// WebSocket chat handler
async function handleWebSocketChat(ws, data, correlationId) {
  try {
    const { sessionId, message, provider } = data;
    const userId = ws.userId;

    // Import required modules (to avoid circular dependencies)
    const User = require('./models/User');
    const Session = require('./models/Session');
    const Message = require('./models/Message');
    const contextManager = require('./services/contextManager');
    const safety = require('./services/safety');

    // Validate and process message (similar to HTTP endpoint)
    const messageData = safety.validateMessage({
      content: message,
      role: 'user',
      sessionId
    });

    // Get user and check quotas
    const user = await User.findById(userId);
    if (!user || user.hasExceededQuotas()) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Quota exceeded'
      }));
      return;
    }

    // Get session
    const session = await Session.findOne({ sessionId, userId, isActive: true });
    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session not found'
      }));
      return;
    }

    // Safety checks
    const safetyCheck = safety.checkContentSafety(messageData.content);
    if (safetyCheck.flagged && safetyCheck.confidence > 0.95) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Content flagged',
        flags: safetyCheck.flags
      }));
      return;
    }

    // Add user message to context
    await contextManager.addMessageToContext(
      sessionId,
      'user',
      messageData.content,
      { correlationId }
    );

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

    let fullResponse = '';
    const startTime = Date.now();

    // Stream response
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
        
        ws.send(JSON.stringify({
          type: 'token',
          content: token,
          messageId: assistantMessage._id,
          sessionId
        }));
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

          // Update session and user
          session.updateContext(result.usage?.totalTokens || 0);
          await session.save();

          user.updateUsage(result.usage?.totalTokens || 0);
          await user.save();

          ws.send(JSON.stringify({
            type: 'done',
            messageId: assistantMessage._id,
            sessionId,
            usage: result.usage,
            responseTime: Date.now() - startTime
          }));

          observability.recordRequest(
            '/ws/chat',
            aiProvider.name,
            true,
            Date.now() - startTime,
            correlationId
          );

        } catch (error) {
          observability.error('WebSocket message finalization failed', error, { correlationId });
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to save response'
          }));
        }
      },
      onError: async (error) => {
        assistantMessage.status = 'error';
        assistantMessage.error = {
          message: error.message,
          code: error.code || 'PROVIDER_ERROR'
        };
        await assistantMessage.save();

        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          retryable: true
        }));

        observability.recordError('websocket-provider-error', aiProvider.name, error, correlationId);
      }
    });

  } catch (error) {
    observability.error('WebSocket chat handler failed', error, { correlationId });
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process message'
    }));
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  observability.error('Unhandled error', error, { 
    correlationId: req.correlationId,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Database connection
async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    observability.info('Connected to MongoDB');
    
    // Create indexes
    await createIndexes();
    
  } catch (error) {
    observability.error('Database connection failed', error);
    process.exit(1);
  }
}

// Create database indexes
async function createIndexes() {
  try {
    const User = require('./models/User');
    const Session = require('./models/Session');
    const Message = require('./models/Message');
    
    // Ensure indexes are created
    await User.createIndexes();
    await Session.createIndexes();
    await Message.createIndexes();
    
    observability.info('Database indexes created');
  } catch (error) {
    observability.error('Failed to create indexes', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  observability.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    observability.info('HTTP server closed');
  });
  
  await mongoose.connection.close();
  observability.info('Database connection closed');
  
  await rateLimiter.close();
  observability.info('Rate limiter closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  observability.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    observability.info('HTTP server closed');
  });
  
  await mongoose.connection.close();
  observability.info('Database connection closed');
  
  await rateLimiter.close();
  observability.info('Rate limiter closed');
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await connectDatabase();
    
    server.listen(config.port, () => {
      observability.info(`Server running on port ${config.port}`, {
        environment: config.nodeEnv,
        port: config.port
      });
    });
    
  } catch (error) {
    observability.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server };