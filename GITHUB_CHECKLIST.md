# GitHub Repository Checklist

## Files That MUST Be in GitHub

### Root Directory
- [x] `package.json` - Dependencies and scripts
- [x] `package-lock.json` - Locked dependency versions
- [x] `.gitignore` - Git ignore rules
- [x] `.env.example` - Environment variable template
- [x] `README.md` - Main documentation
- [x] `FIRST_TIME_SETUP.md` - Quick setup guide
- [x] `SETUP_FOR_NEW_USERS.md` - Detailed setup guide
- [x] `NEW_USER_CHECKLIST.md` - Setup checklist
- [x] `QUICKSTART.md` - Quick start guide
- [x] `init-project.js` - Project initialization script
- [x] `setup.js` - Setup script
- [x] `start.js` - Startup script
- [x] `start-simple.js` - Simple startup alternative
- [x] `start.sh` - Linux/Mac startup script
- [x] `start.ps1` - PowerShell startup script
- [x] `start.bat` - Windows batch startup script
- [x] `start-manual.bat` - Manual Windows startup
- [x] `docker-compose.yml` - Docker configuration
- [x] `Dockerfile` - Docker build file
- [x] `.eslintrc.js` - ESLint configuration
- [x] `.prettierrc` - Prettier configuration
- [x] `jest.config.js` - Jest test configuration

### Client Directory
- [x] `client/package.json` - Client dependencies
- [x] `client/package-lock.json` - Client locked dependencies
- [x] `client/Dockerfile` - Client Docker build
- [x] `client/nginx.conf` - Nginx configuration
- [x] `client/tailwind.config.js` - Tailwind CSS config
- [x] `client/postcss.config.js` - PostCSS config

### Client Public Directory (IMPORTANT!)
- [x] `client/public/index.html` - Main HTML file
- [x] `client/public/manifest.json` - PWA manifest
- [x] `client/public/robots.txt` - SEO robots file
- [x] `client/public/README_ASSETS.md` - Assets documentation
- [ ] `client/public/favicon.ico` - Optional (browser icon)
- [ ] `client/public/logo192.png` - Optional (PWA icon)
- [ ] `client/public/logo512.png` - Optional (PWA icon)

### Client Source Directory
- [x] `client/src/index.js` - React entry point
- [x] `client/src/index.css` - Global styles
- [x] `client/src/App.js` - Main App component
- [x] `client/src/App.css` - App styles
- [x] `client/src/components/` - All React components
- [x] `client/src/contexts/` - React contexts

### Server Directory
- [x] `server/server.js` - Express server entry
- [x] `server/config/` - Configuration files
- [x] `server/models/` - Mongoose models
- [x] `server/routes/` - API routes
- [x] `server/services/` - Business logic services
- [x] `server/providers/` - AI provider implementations
- [x] `server/tests/` - Test files

### Other Directories
- [x] `seed/` - Database seeding scripts
- [x] `scripts/` - Utility scripts
- [x] `docs/` - Documentation
- [x] `.github/workflows/` - CI/CD workflows

## Files That Should NOT Be in GitHub

These are in `.gitignore` and should never be committed:

### Environment Files
- [ ] `.env` - Contains secrets (use `.env.example` instead)
- [ ] `client/.env` - Client environment variables

### Dependencies
- [ ] `node_modules/` - Root dependencies
- [ ] `client/node_modules/` - Client dependencies

### Build Outputs
- [ ] `client/build/` - React production build
- [ ] `server/dist/` - Server build output
- [ ] `dist/` - Any distribution files
- [ ] `build/` - Any build files

### Logs and Runtime
- [ ] `logs/` - Application logs
- [ ] `*.log` - Log files
- [ ] `*.pid` - Process ID files

### IDE and OS Files
- [ ] `.vscode/` - VS Code settings
- [ ] `.idea/` - IntelliJ settings
- [ ] `.DS_Store` - Mac OS files
- [ ] `Thumbs.db` - Windows files

### Credentials
- [ ] `*.pem` - SSL certificates
- [ ] `*.key` - Private keys
- [ ] `service-account*.json` - Google Cloud credentials
- [ ] `credentials*.json` - Any credentials

### Database Files
- [ ] `*.db` - SQLite databases
- [ ] `*.sqlite` - SQLite databases

## Common Issues After Cloning

### Issue 1: "Cannot find module"
**Cause**: `node_modules/` not installed
**Fix**: Run `npm run init` or `npm install && cd client && npm install`

### Issue 2: "Missing .env file"
**Cause**: `.env` files are not in Git
**Fix**: Run `npm run init` or copy from `.env.example`

### Issue 3: "Cannot find logs directory"
**Cause**: Empty directories not tracked by Git
**Fix**: Run `npm run init` or `mkdir logs`

### Issue 4: "Missing favicon.ico"
**Cause**: Image files not included (optional)
**Fix**: Ignore the warning or add your own icons

### Issue 5: "Public folder missing"
**Cause**: Was accidentally in `.gitignore`
**Fix**: Already fixed! `client/public/` is now tracked

## Verification Commands

Run these to verify your repo is complete:

```bash
# Check if essential files exist
ls -la package.json
ls -la client/package.json
ls -la client/public/index.html
ls -la server/server.js
ls -la .env.example

# Check if gitignore is working
git status
# Should NOT show: .env, node_modules/, logs/

# Check what's tracked
git ls-files | grep "client/public"
# Should show: client/public/index.html, manifest.json, robots.txt
```

## Before Pushing to GitHub

1. **Remove sensitive data**:
   ```bash
   # Check for accidentally committed secrets
   git log --all --full-history -- .env
   git log --all --full-history -- "*.key"
   ```

2. **Verify .gitignore**:
   ```bash
   git status
   # Make sure no .env, node_modules, or logs are staged
   ```

3. **Test clean clone**:
   ```bash
   # In a different directory
   git clone <your-repo-url> test-clone
   cd test-clone
   npm run init
   npm run seed
   npm start
   ```

4. **Update README**:
   - Add repository URL
   - Add setup instructions
   - Add demo credentials
   - Add screenshots (optional)

## Creating Orphan Branch for Assets

If you want to store large binary files (images, videos) separately:

```bash
# Create orphan branch
git checkout --orphan assets
git rm -rf .

# Add only asset files
mkdir assets
# Copy your images to assets/
git add assets/
git commit -m "Add project assets"
git push origin assets

# Switch back to main
git checkout main
```

Then reference assets in README:
```markdown
![Logo](https://github.com/username/repo/blob/assets/logo.png?raw=true)
```

## Quick Fix for Your Friend

If your friend cloned and has missing files:

```bash
# Pull latest changes (includes fixed .gitignore)
git pull origin main

# Initialize project
npm run init

# Verify files
ls -la client/public/
# Should see: index.html, manifest.json, robots.txt

# Start the app
npm run seed
npm start
```

## Summary

✅ **Essential files are now in Git**:
- All source code
- Configuration files
- Setup scripts
- Documentation
- `client/public/` directory with HTML, manifest, robots.txt

❌ **Not in Git (by design)**:
- Environment variables (.env)
- Dependencies (node_modules)
- Logs
- Build outputs
- Optional image assets (favicon, logos)

Your friend should now be able to clone and run with just:
```bash
git clone <repo>
cd <repo>
npm run init
npm run seed
npm start
```
