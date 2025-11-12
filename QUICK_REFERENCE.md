# Quick Reference Card

## For You (Pushing to GitHub)

```bash
# Fix git and push everything
fix-git-and-push.bat

# Or manually
git add .
git commit -m "Add essential files and fix missing client/public files"
git push origin main
```

## For Your Friend (After Cloning)

```bash
# Clone
git clone <repo-url>
cd <repo-name>

# Setup (one command!)
npm run init

# Seed database
npm run seed

# Start app
npm start
```

## What npm run init Does

- ✅ Creates `.env` files with secure JWT secret
- ✅ Installs root dependencies
- ✅ Installs client dependencies
- ✅ Creates `logs/` directory
- ✅ Shows next steps

## Files Fixed

| File | Status | Notes |
|------|--------|-------|
| `client/public/index.html` | ✅ Exists | Main HTML file |
| `client/public/manifest.json` | ✅ Created | PWA manifest |
| `client/public/robots.txt` | ✅ Created | SEO robots |
| `client/public/favicon.ico` | ⚠️ Optional | Browser icon |
| `client/public/logo192.png` | ⚠️ Optional | PWA icon |
| `client/public/logo512.png` | ⚠️ Optional | PWA icon |
| `.env` | ❌ Not in Git | Created by init script |
| `client/.env` | ❌ Not in Git | Created by init script |
| `logs/` | ❌ Not in Git | Created by init script |

## Common Commands

```bash
# Setup
npm run init              # First-time setup
npm install               # Install root deps
cd client && npm install  # Install client deps

# Database
npm run seed              # Seed demo data
npm run reset-quotas      # Reset rate limits

# Running
npm start                 # Start both servers
npm run dev               # Development mode
npm run start:backend     # Backend only
npm run start:frontend    # Frontend only

# Testing
npm test                  # Run tests
npm run lint              # Lint code

# Troubleshooting
npx kill-port 3000 4000   # Kill ports
mkdir logs                # Create logs dir
```

## Environment Variables

### Root `.env`
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/ai-chat-platform
JWT_SECRET=<generated-by-init-script>
AI_PROVIDER=mock
```

### Client `.env`
```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000
```

## Demo Credentials

```
Email: demo@example.com
Password: demo123
```

## URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Health Check: http://localhost:4000/health

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to MongoDB | `net start MongoDB` or `docker run -d -p 27017:27017 mongo` |
| Port already in use | `npx kill-port 3000 4000` |
| Module not found | `npm install && cd client && npm install` |
| Missing .env | `npm run init` |
| Missing logs directory | `mkdir logs` |

## Documentation

- `FIRST_TIME_SETUP.md` - Quick 4-step guide
- `SETUP_FOR_NEW_USERS.md` - Detailed setup
- `NEW_USER_CHECKLIST.md` - Interactive checklist
- `GITHUB_CHECKLIST.md` - Git best practices
- `README.md` - Full documentation

## Git Commands

```bash
# Check status
git status

# Stage all
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main

# Pull latest
git pull origin main

# Clone
git clone <repo-url>
```

## MongoDB Commands

```bash
# Windows
net start MongoDB
net stop MongoDB

# Linux/Mac
sudo systemctl start mongod
sudo systemctl stop mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker stop mongodb
docker start mongodb
```

## Project Structure

```
AI_Chatbot/
├── client/              # React frontend
│   ├── public/          # Static files (HTML, manifest)
│   ├── src/             # React components
│   └── package.json
├── server/              # Express backend
│   ├── config/          # Configuration
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js
├── seed/                # Database seeding
├── scripts/             # Utility scripts
├── logs/                # Application logs (not in Git)
├── .env                 # Environment variables (not in Git)
└── package.json         # Root dependencies
```

## Quick Fixes

```bash
# Reset everything
rm -rf node_modules client/node_modules
npm install
cd client && npm install && cd ..

# Fresh database
npm run seed

# Kill all Node processes
taskkill /f /im node.exe

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

**Keep this card handy for quick reference!**
