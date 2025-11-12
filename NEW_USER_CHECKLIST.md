# New User Setup Checklist ✅

Use this checklist after cloning the repository.

## Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] MongoDB installed OR Docker installed
- [ ] Git installed

## Quick Setup (Recommended)

- [ ] Run `npm run init` - This does everything automatically!
- [ ] Start MongoDB (see options below)
- [ ] Run `npm run seed`
- [ ] Run `npm start`
- [ ] Open http://localhost:3000
- [ ] Login with `demo@example.com` / `demo123`

## Manual Setup (If you have existing .env files)

### 1. Create Required Directories
- [ ] Create `logs/` directory
  ```bash
  mkdir logs
  ```

### 2. Install Dependencies
- [ ] Install root dependencies
  ```bash
  npm install
  ```
- [ ] Install client dependencies
  ```bash
  cd client
  npm install
  cd ..
  ```

### 3. Environment Files
- [ ] Root `.env` file exists (copy from `.env.example` if needed)
- [ ] Client `.env` file exists in `client/.env`
- [ ] JWT_SECRET is set in root `.env`
- [ ] MONGODB_URI is set in root `.env`
- [ ] REACT_APP_API_URL is set in `client/.env`

### 4. MongoDB Setup
Choose ONE option:

- [ ] **Option A: Local MongoDB**
  ```bash
  # Windows
  net start MongoDB
  
  # Linux/Mac
  sudo systemctl start mongod
  ```

- [ ] **Option B: Docker MongoDB**
  ```bash
  docker run -d -p 27017:27017 --name mongodb mongo:latest
  ```

- [ ] **Option C: Docker Compose**
  ```bash
  docker-compose up -d
  ```

### 5. Database Seeding
- [ ] Run seed script
  ```bash
  npm run seed
  ```
- [ ] Verify demo user created

### 6. Start Application
- [ ] Start the application
  ```bash
  npm start
  ```
  OR manually:
  ```bash
  # Terminal 1
  node server/server.js
  
  # Terminal 2
  cd client && npm start
  ```

### 7. Verification
- [ ] Backend health check: http://localhost:4000/health
- [ ] Frontend loads: http://localhost:3000
- [ ] Can login with demo credentials
- [ ] Can send messages
- [ ] Messages get AI responses

## Common Files That Should Exist

### Root Directory
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `.env.example`
- [ ] `.gitignore`
- [ ] `README.md`
- [ ] `FIRST_TIME_SETUP.md`
- [ ] `SETUP_FOR_NEW_USERS.md`
- [ ] `init-project.js`
- [ ] `setup.js`
- [ ] `start.js`
- [ ] `docker-compose.yml`
- [ ] `Dockerfile`

### Server Directory
- [ ] `server/server.js`
- [ ] `server/config/`
- [ ] `server/models/`
- [ ] `server/routes/`
- [ ] `server/services/`
- [ ] `server/providers/`

### Client Directory
- [ ] `client/package.json`
- [ ] `client/public/`
- [ ] `client/src/`
- [ ] `client/src/App.js`
- [ ] `client/src/components/`
- [ ] `client/src/contexts/`

### Other Directories
- [ ] `seed/`
- [ ] `scripts/`
- [ ] `docs/`
- [ ] `.github/workflows/`

## Files You Need to Create (Not in Git)

These files are in `.gitignore` and must be created:

- [ ] `.env` (root)
- [ ] `client/.env`
- [ ] `logs/` directory
- [ ] `node_modules/` (created by npm install)
- [ ] `client/node_modules/` (created by npm install)

## Environment Variables Checklist

### Root `.env` File
- [ ] `PORT=4000`
- [ ] `NODE_ENV=development`
- [ ] `MONGODB_URI=mongodb://localhost:27017/ai-chat-platform`
- [ ] `JWT_SECRET=<your-secret-here>`
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `AI_PROVIDER=mock`
- [ ] `CORS_ORIGIN=http://localhost:3000`

### Client `.env` File
- [ ] `REACT_APP_API_URL=http://localhost:4000`
- [ ] `REACT_APP_WS_URL=ws://localhost:4000`

## Troubleshooting Checklist

### If Backend Won't Start
- [ ] MongoDB is running
- [ ] Port 4000 is free (`npx kill-port 4000`)
- [ ] `.env` file exists in root
- [ ] `JWT_SECRET` is set
- [ ] Dependencies installed (`npm install`)
- [ ] Check logs in `logs/app.log`

### If Frontend Won't Start
- [ ] Port 3000 is free (`npx kill-port 3000`)
- [ ] `client/.env` file exists
- [ ] Client dependencies installed (`cd client && npm install`)
- [ ] Backend is running first

### If Database Connection Fails
- [ ] MongoDB is running (`docker ps` or `sc query MongoDB`)
- [ ] MONGODB_URI is correct in `.env`
- [ ] Can connect manually: `mongosh mongodb://localhost:27017`

### If Login Fails
- [ ] Database was seeded (`npm run seed`)
- [ ] Backend is running
- [ ] Check browser console for errors
- [ ] Check network tab for API calls

## Quick Commands Reference

```bash
# Initialize project (first time only)
npm run init

# Install dependencies
npm install
cd client && npm install && cd ..

# Start MongoDB (Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Seed database
npm run seed

# Start application
npm start

# Start in development mode
npm run dev

# Run tests
npm test

# Kill ports
npx kill-port 3000 4000

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Success Criteria

You're all set when:
- [ ] No errors in terminal
- [ ] Backend shows "Server running on port 4000"
- [ ] Frontend opens in browser automatically
- [ ] Can login with demo@example.com / demo123
- [ ] Can send messages and get AI responses
- [ ] No console errors in browser

## Need Help?

1. Read `FIRST_TIME_SETUP.md` for quick start
2. Read `SETUP_FOR_NEW_USERS.md` for detailed guide
3. Check `README.md` for project documentation
4. Review logs in `logs/app.log`
5. Check browser console (F12)

## Demo Credentials

```
Email: demo@example.com
Password: demo123
```

---

**Once all checkboxes are checked, you're ready to go! 🎉**
