#!/bin/bash

# Script to commit all essential files for GitHub

echo "🔍 Adding essential files to Git..."

# Root files
git add package.json package-lock.json
git add .gitignore .env.example
git add .eslintrc.js .prettierrc jest.config.js
git add docker-compose.yml Dockerfile

# Documentation
git add README.md QUICKSTART.md
git add FIRST_TIME_SETUP.md SETUP_FOR_NEW_USERS.md
git add NEW_USER_CHECKLIST.md GITHUB_CHECKLIST.md

# Scripts
git add init-project.js setup.js start.js
git add start.sh start.ps1 start.bat start-manual.bat

# Client directory
git add client/package.json client/package-lock.json
git add client/Dockerfile client/nginx.conf
git add client/tailwind.config.js client/postcss.config.js

# Client public (IMPORTANT!)
git add client/public/index.html
git add client/public/manifest.json
git add client/public/robots.txt
git add client/public/README_ASSETS.md

# Client source
git add client/src/

# Server
git add server/

# Other directories
git add seed/
git add scripts/
git add docs/
git add .github/

echo "✅ Files staged for commit"
echo ""
echo "📋 Summary of changes:"
git status --short

echo ""
echo "💡 Next steps:"
echo "1. Review changes: git status"
echo "2. Commit: git commit -m 'Add essential files and setup scripts'"
echo "3. Push: git push origin main"
