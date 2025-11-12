@echo off
echo ========================================
echo Git Config Fix and Push Script
echo ========================================
echo.

REM Check if git config is broken
git config --list >nul 2>&1
if errorlevel 1 (
    echo Git config appears broken. Attempting to fix...
    echo.
    
    REM Backup current config
    if exist .git\config (
        echo Backing up .git\config...
        copy .git\config .git\config.backup >nul
    )
    
    REM Get current remote URL if possible
    echo.
    echo Please enter your GitHub repository URL:
    echo Example: https://github.com/username/repo.git
    set /p REPO_URL="Repository URL: "
    
    REM Reinitialize git
    echo.
    echo Reinitializing git repository...
    git init
    
    REM Add remote
    echo Adding remote origin...
    git remote add origin %REPO_URL%
    
    echo.
    echo Git config fixed!
    echo.
)

echo ========================================
echo Staging Essential Files
echo ========================================
echo.

REM Add all essential files
git add package.json package-lock.json
git add .gitignore .env.example
git add .eslintrc.js .prettierrc jest.config.js
git add docker-compose.yml Dockerfile

git add README.md QUICKSTART.md
git add FIRST_TIME_SETUP.md SETUP_FOR_NEW_USERS.md
git add NEW_USER_CHECKLIST.md GITHUB_CHECKLIST.md
git add PUSH_TO_GITHUB.md

git add init-project.js setup.js start.js
git add start.sh start.ps1 start.bat start-manual.bat
git add commit-essential-files.sh commit-essential-files.bat
git add fix-git-and-push.bat

git add client/package.json client/package-lock.json
git add client/Dockerfile client/nginx.conf
git add client/tailwind.config.js client/postcss.config.js

git add client/public/index.html
git add client/public/manifest.json
git add client/public/robots.txt
git add client/public/README_ASSETS.md

git add client/src/
git add server/
git add seed/
git add scripts/
git add docs/
git add .github/

echo.
echo ========================================
echo Files Staged
echo ========================================
git status --short

echo.
echo ========================================
echo Ready to Commit and Push
echo ========================================
echo.
echo What would you like to do?
echo 1. Commit and push now
echo 2. Just commit (don't push yet)
echo 3. Cancel (review changes first)
echo.
set /p CHOICE="Enter choice (1-3): "

if "%CHOICE%"=="1" (
    echo.
    echo Committing changes...
    git commit -m "Add essential files, setup scripts, and fix missing client/public files"
    
    echo.
    echo Pushing to GitHub...
    git push origin main
    
    if errorlevel 1 (
        echo.
        echo Push failed. Trying with force...
        echo WARNING: This will overwrite remote history!
        set /p CONFIRM="Continue? (y/n): "
        if /i "%CONFIRM%"=="y" (
            git push -f origin main
        )
    )
    
    echo.
    echo ========================================
    echo Done!
    echo ========================================
    echo.
    echo Your friend can now:
    echo 1. git clone your-repo-url
    echo 2. npm run init
    echo 3. npm run seed
    echo 4. npm start
    echo.
)

if "%CHOICE%"=="2" (
    echo.
    echo Committing changes...
    git commit -m "Add essential files, setup scripts, and fix missing client/public files"
    
    echo.
    echo Committed! To push later, run:
    echo git push origin main
    echo.
)

if "%CHOICE%"=="3" (
    echo.
    echo Cancelled. Review changes with:
    echo git status
    echo git diff --staged
    echo.
    echo When ready, run this script again or:
    echo git commit -m "Your message"
    echo git push origin main
    echo.
)

pause
