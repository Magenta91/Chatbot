# Setup Guide for New Users

This guide will help you set up the AI Chat Platform after cloning from GitHub.

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running (or use Docker)
- Git installed

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd AI_Chatbot
```

## Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

## Step 3: Create Required Directories

Some directories are not tracked by Git. Create them:

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path logs

# Linux/Mac
mkdir -p logs
```

## Step 4: Environment Configuration

### Root .env File

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-chat-platform

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AI Provider Configuration (choose one or multiple)
AI_PROVIDER=mock

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Google Dialogflow Configuration (if using Dialogflow)
DIALOGFLOW_PROJECT_ID=your-project-id
DIALOGFLOW_LANGUAGE_CODE=en
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json

# Redis Configuration (optional - for rate limiting)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Safety & Moderation
ENABLE_CONTENT_SAFETY=true
SAFETY_THRESHOLD=0.7

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Client .env File

Create a `.env` file in the `client/` directory:

```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000
```

## Step 5: Generate JWT Secret

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and replace `your-super-secret-jwt-key-change-this-in-production` in your `.env` file.

## Step 6: Start MongoDB

### Option A: Local MongoDB
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Option B: Docker MongoDB
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option C: Use Docker Compose (includes MongoDB)
```bash
docker-compose up -d
```

## Step 7: Seed the Database

Create demo user and initial data:

```bash
npm run seed
```

This creates:
- Demo user: `demo@example.com` / `demo123`
- Sample chat sessions
- Initial prompts

## Step 8: Start the Application

### Option A: Automated Startup (Recommended)
```bash
npm start
```

### Option B: Manual Startup (Two Terminals)

**Terminal 1 - Backend:**
```bash
node server/server.js
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### Option C: Development Mode with Auto-Reload
```bash
npm run dev
```

## Step 9: Verify Installation

1. **Backend Health Check**: http://localhost:4000/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: http://localhost:3000
   - Should open the login page

3. **Login**: Use demo credentials
   - Email: `demo@example.com`
   - Password: `demo123`

## Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"

**Solution:**
```bash
# Check if MongoDB is running
# Windows
sc query MongoDB

# Linux/Mac
sudo systemctl status mongod

# Or use Docker
docker ps | grep mongo
```

### Issue: "Port 3000 or 4000 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9

# Or use npx
npx kill-port 3000 4000
```

### Issue: "Module not found"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

cd client
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Issue: "JWT secret not configured"

**Solution:**
Generate a new secret and add it to `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Issue: "Cannot find logs directory"

**Solution:**
```bash
mkdir logs
```

### Issue: Backend starts but times out

**Solution:**
Try manual startup method (Option B above) to see actual error messages.

## AI Provider Setup

### Using Mock Provider (Default - No API Key Needed)
```env
AI_PROVIDER=mock
```

### Using OpenAI
1. Get API key from https://platform.openai.com/api-keys
2. Update `.env`:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-3.5-turbo
```

### Using Google Dialogflow
1. Create a Google Cloud project
2. Enable Dialogflow API
3. Create a service account and download JSON key
4. Update `.env`:
```env
AI_PROVIDER=dialogflow
DIALOGFLOW_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

## Project Structure

```
AI_Chatbot/
├── client/              # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── App.js
│   ├── .env            # Frontend environment variables
│   └── package.json
├── server/             # Express backend
│   ├── config/
│   ├── models/
│   ├── providers/
│   ├── routes/
│   ├── services/
│   └── server.js
├── seed/               # Database seeding scripts
├── scripts/            # Utility scripts
├── logs/               # Application logs (create this)
├── .env                # Backend environment variables
├── .env.example        # Example environment file
├── package.json
└── README.md
```

## Quick Commands Reference

```bash
# Start application
npm start

# Start in development mode
npm run dev

# Seed database
npm run seed

# Run tests
npm test

# Reset rate limit quotas
npm run reset-quotas

# Lint code
npm run lint

# Format code
npm run format
```

## Need Help?

1. Check the main README.md for detailed documentation
2. Check QUICKSTART.md for quick setup
3. Review logs in `logs/app.log`
4. Check browser console for frontend errors
5. Check terminal output for backend errors

## Security Notes

- Never commit `.env` files to Git
- Change JWT_SECRET in production
- Use strong passwords
- Keep API keys secure
- Review `.gitignore` to ensure sensitive files are excluded

## Next Steps

After successful setup:
1. Explore the chat interface
2. Try different AI providers
3. Customize prompts in Settings
4. Review the API documentation
5. Set up your own AI provider keys for production use

Happy coding! 🚀
