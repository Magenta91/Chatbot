# First Time Setup - Quick Start

Just cloned the repo? Follow these 4 simple steps:

## Step 1: Initialize Project

```bash
npm run init
```

This will:
- Create required directories (`logs/`)
- Generate `.env` files with secure JWT secret
- Install all dependencies (root + client)

## Step 2: Start MongoDB

Choose one option:

```bash
# Option A: Local MongoDB (Windows)
net start MongoDB

# Option B: Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option C: Docker Compose (includes everything)
docker-compose up -d
```

## Step 3: Seed Database

```bash
npm run seed
```

Creates demo user: `demo@example.com` / `demo123`

## Step 4: Start Application

```bash
npm start
```

Open http://localhost:3000 and login!

---

## If You Already Have .env Files

If you already have your `.env` files configured:

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Create logs directory
mkdir logs

# 3. Start MongoDB (see Step 2 above)

# 4. Seed database
npm run seed

# 5. Start app
npm start
```

---

## Troubleshooting

### "Cannot connect to MongoDB"
Make sure MongoDB is running (see Step 2)

### "Port already in use"
```bash
npx kill-port 3000 4000
```

### "Module not found"
```bash
npm install
cd client && npm install
```

### Need more help?
See `SETUP_FOR_NEW_USERS.md` for detailed guide.

---

**That's it! You're ready to go! 🚀**
