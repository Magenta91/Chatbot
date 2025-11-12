# 🤖 AI Chat Platform

A production-ready, provider-agnostic AI chat platform built with the MERN stack. Features real-time streaming responses, intelligent session management, context summarization, and comprehensive observability.

![AI Chat Platform](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

### Core Functionality
- **Provider-Agnostic**: Support for OpenAI, Dialogflow, and mock providers with unified interface
- **Real-time Streaming**: SSE and WebSocket support with automatic fallback
- **Session Management**: Persistent conversations with automatic TTL cleanup
- **Context Control**: Automatic summarization and manual context management
- **User Authentication**: JWT-based auth with role-based access control

### Production Features
- **Rate Limiting**: Redis-backed with in-memory fallback
- **Safety & Moderation**: Input validation, prompt injection detection, profanity filtering
- **Observability**: Structured logging, metrics collection, correlation IDs
- **Scalability**: Horizontal scaling ready with session persistence
- **Security**: CORS, helmet, input sanitization, secure headers

### Developer Experience
- **Docker Compose**: One-command local development setup
- **Testing**: Unit tests, contract tests, E2E test scaffold
- **CI/CD**: GitHub Actions workflow with security scanning
- **Documentation**: Comprehensive API docs and setup guides

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- MongoDB (or use Docker)
- Redis (optional, falls back to in-memory)

### Complete Setup (First Time)

**🎯 Complete setup with one command:**

```bash
npm run setup
```

This will install dependencies, configure the platform, and seed demo data.

### Start the Platform

**🚀 Start everything with a single command:**

```bash
npm start
```

### Alternative Methods

```bash
# Development mode with auto-reload
npm run dev

# Platform-specific scripts
# Windows: start.bat
# Unix/Linux/Mac: ./start.sh
```

### Access Points
- **Frontend**: http://localhost:3000  
- **Backend**: http://localhost:4000
- **Demo Login**: demo@example.com / demo123

This setup will:
- ✅ Check all requirements
- ✅ Install dependencies (if needed)
- ✅ Start the backend server
- ✅ Seed the database with demo data
- ✅ Start the frontend development server
- ✅ Open both servers with proper logging

### Manual Development Setup

If you prefer to start services manually:

1. **Clone and configure**
   ```bash
   git clone <repository-url>
   cd ai-chat-platform
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Start backend**
   ```bash
   npm run start:backend
   ```

4. **Start frontend** (in another terminal)
   ```bash
   npm run start:frontend
   ```

5. **Seed demo data** (optional)
   ```bash
   npm run seed
   ```

### Docker Setup

```bash
docker-compose up --build
```

### Access Points
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **Metrics**: http://localhost:4000/metrics

### Demo Accounts
- **User**: demo@example.com / demo123
- **Admin**: admin@example.com / demo123

## 📋 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key | - | No* |
| `DIALOGFLOW_PROJECT_ID` | Google Dialogflow project ID | - | No* |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google service account JSON | - | No* |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/ai-chat-platform` | Yes |
| `REDIS_URL` | Redis connection string | - | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` | Yes |
| `PORT` | Server port | `4000` | No |
| `NODE_ENV` | Environment mode | `development` | No |

*At least one AI provider must be configured, or use mock provider for testing.

## 🏗️ Architecture

### Backend Structure
```
server/
├── config/           # Environment configuration
├── models/           # Mongoose schemas
├── providers/        # AI provider implementations
├── routes/           # Express route handlers
├── services/         # Business logic services
└── tests/           # Test suites
```

### Frontend Structure
```
client/src/
├── components/       # React components
├── contexts/         # React context providers
├── hooks/           # Custom React hooks
└── utils/           # Utility functions
```

### Key Components

#### Provider Interface
All AI providers implement a unified interface:
```javascript
async streamResponse({ messages, systemPrompt, options, onToken, onDone, onError })
async generateResponse({ messages, systemPrompt, options })
async testConnection()
```

#### Services
- **Context Manager**: Handles conversation context and summarization
- **Rate Limiter**: Redis-backed rate limiting with fallback
- **Safety Service**: Content moderation and input validation
- **Observability**: Logging, metrics, and correlation tracking

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Categories
```bash
# Unit tests
npm test -- --testPathPattern=unit

# Contract tests (provider interface compliance)
npm test -- --testPathPattern=contract

# Integration tests
npm test -- --testPathPattern=integration

# Coverage report
npm test -- --coverage
```

### Test Configuration
- Uses Jest with MongoDB Memory Server
- Mock providers for deterministic testing
- Contract tests ensure provider interface compliance
- E2E tests verify streaming and context retention

## 📊 Monitoring & Observability

### Metrics Endpoint
```bash
curl http://localhost:4000/metrics
```

Returns JSON with:
- Request counts and success rates
- Latency percentiles (p95, p99)
- Token usage by provider and user
- Error rates and types
- Active session counts

### Logging
Structured JSON logs with correlation IDs:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Message processed successfully",
  "correlationId": "uuid-here",
  "userId": "user-id",
  "sessionId": "session-id",
  "provider": "openai",
  "tokens": 150
}
```

### Health Checks
```bash
curl http://localhost:4000/health
```

## 🔒 Security Features

- **Authentication**: JWT tokens with refresh capability
- **Authorization**: Role-based access control
- **Rate Limiting**: Per-user and per-IP limits
- **Input Validation**: Joi schemas for all inputs
- **Content Safety**: Prompt injection and profanity detection
- **CORS**: Configurable origin restrictions
- **Headers**: Security headers via Helmet
- **Secrets**: Environment-based configuration only

## 🚀 Deployment

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Setup
1. Configure production environment variables
2. Set up MongoDB cluster
3. Configure Redis cluster (optional)
4. Set up reverse proxy (nginx/traefik)
5. Configure SSL certificates
6. Set up monitoring and alerting

### Scaling Considerations
- Stateless API servers (scale horizontally)
- Session data in MongoDB (shared state)
- Redis for rate limiting (shared cache)
- WebSocket connections (sticky sessions or Redis adapter)

## 🔧 Configuration

### Provider Configuration
Add new providers by implementing the provider interface:

```javascript
class CustomProvider {
  constructor() {
    this.name = 'custom';
  }

  async streamResponse({ messages, systemPrompt, options, onToken, onDone, onError }) {
    // Implementation
  }

  async generateResponse({ messages, systemPrompt, options }) {
    // Implementation
  }

  async testConnection() {
    // Implementation
  }
}
```

### Feature Flags
- `USE_DIALOGFLOW`: Enable/disable Dialogflow provider
- `ENABLE_METRICS`: Enable/disable metrics collection
- `ENABLE_PROFANITY_FILTER`: Enable/disable content filtering

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/preferences` - Update user preferences

### Chat Endpoints
- `POST /api/v1/chat/session` - Create new session
- `POST /api/v1/chat/message` - Send message (streaming)
- `GET /api/v1/chat/sessions` - List user sessions
- `GET /api/v1/chat/sessions/:id/messages` - Get session messages
- `DELETE /api/v1/chat/sessions/:id/context` - Clear session context
- `POST /api/v1/chat/sessions/:id/summarize` - Summarize session
- `GET /api/v1/chat/sessions/:id/export` - Export conversation

### WebSocket API
Connect to `/ws/chat` and send:
```json
{
  "type": "auth",
  "token": "jwt-token"
}
```

Then send chat messages:
```json
{
  "type": "chat",
  "sessionId": "session-id",
  "message": "Hello",
  "provider": "openai"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines
- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Documentation**: Check the `/docs` folder for detailed guides
- **Community**: Join our Discord/Slack for discussions

## 🗺️ Roadmap

- [ ] Voice input/output support
- [ ] File upload and processing
- [ ] Plugin system for custom providers
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Kubernetes deployment configs
- [ ] Advanced prompt templates
- [ ] Conversation sharing and collaboration
- [ ] API rate limiting per plan/tier

---

## 🌟 Repository Information

- **Repository**: [Magenta91/Chatbot](https://github.com/Magenta91/Chatbot)
- **License**: MIT License
- **Contributions**: Welcome! Please read the contributing guidelines
- **Issues**: Report bugs and request features via GitHub Issues

## 📈 Project Stats

![GitHub stars](https://img.shields.io/github/stars/Magenta91/Chatbot?style=social)
![GitHub forks](https://img.shields.io/github/forks/Magenta91/Chatbot?style=social)
![GitHub issues](https://img.shields.io/github/issues/Magenta91/Chatbot)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Magenta91/Chatbot)

---

**Built with ❤️ for the AI community**