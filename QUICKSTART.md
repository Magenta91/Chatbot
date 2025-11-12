# 🚀 Quick Start Guide

## One-Command Setup

```bash
npm run setup
```

This will:
- Install all dependencies
- Create configuration files
- Seed demo data
- Configure the platform

## Start the Platform

```bash
npm start
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## Demo Accounts

- **Email**: demo@example.com
- **Password**: demo123

## Features Available

### ✅ Core Features
- Real AI conversations (OpenAI + Mock provider)
- Streaming responses with real-time typing
- Session management and history
- Scrollable chat interface with smart controls
- Provider switching (OpenAI/Mock)
- Export conversations (JSON/Text)

### ✅ UI Features
- Responsive design (mobile-friendly)
- Dark/light theme support
- Typing indicators and status
- Message timestamps and read status
- Keyboard shortcuts (Home/End/PgUp/PgDn)
- Auto-scroll with manual override

### ✅ Advanced Features
- Context summarization for long conversations
- Rate limiting and quota management
- Safety filters and content moderation
- Observability with metrics and logging
- WebSocket and SSE streaming support

## Configuration

### OpenAI Setup (Optional)
1. Get API key from https://platform.openai.com/
2. Edit `.env` file:
   ```
   OPENAI_API_KEY=your_key_here
   ```
3. Restart the platform

### Provider Settings
- **Mock Provider**: Free, unlimited, realistic responses
- **OpenAI Provider**: Real AI, requires API key, free tier available

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start full platform (recommended) |
| `npm run dev` | Development mode with auto-reload |
| `npm test` | Run test suite |
| `npm run seed` | Reset and seed database |
| `npm run setup` | Complete setup from scratch |

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 4000
npx kill-port 3000 4000
npm start
```

### Database Issues
```bash
# Reset database
npm run seed
```

### Dependency Issues
```bash
# Clean install
rm -rf node_modules client/node_modules
npm run setup
```

## Development

### Project Structure
```
├── server/          # Backend API (Node.js/Express)
├── client/          # Frontend (React)
├── seed/            # Database seeding
├── scripts/         # Utility scripts
└── docs/            # Documentation
```

### Adding New Providers
See `docs/MIGRATION_GUIDE.md` for detailed instructions.

### Testing
```bash
# Unit tests
npm test

# Contract tests
npm test -- --testPathPattern=contract

# Coverage report
npm test -- --coverage
```

## Production Deployment

### Docker
```bash
docker-compose up --build
```

### Manual
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring

## Support

- **Issues**: Create GitHub issue
- **Documentation**: Check `/docs` folder
- **Examples**: See demo conversations after seeding

---

**🎉 You're ready to start chatting with AI!**