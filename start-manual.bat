@echo off
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🤖 AI Chat Platform                      ║
echo ║                   Manual Startup (Windows)                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check dependencies
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

if not exist "client\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd client
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

REM Create logs directory
if not exist "logs" mkdir logs

echo.
echo 🌱 Seeding database...
node seed/seedDemo.js

echo.
echo 🚀 Starting backend server...
start "AI Chat Backend" cmd /k "node server/server.js"

echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 🎨 Starting frontend server...
start "AI Chat Frontend" cmd /k "cd client && set BROWSER=none && npm start"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        🎉 SUCCESS!                          ║
echo ║                                                              ║
echo ║  Backend:  http://localhost:4000                             ║
echo ║  Frontend: http://localhost:3000                             ║
echo ║                                                              ║
echo ║  Demo Accounts:                                              ║
echo ║  📧 demo@example.com / demo123                               ║
echo ║  📧 admin@example.com / demo123                              ║
echo ║                                                              ║
echo ║  Two new windows opened for backend and frontend             ║
echo ║  Close those windows to stop the servers                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Wait a bit then open browser
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo 🌐 Browser should open automatically
echo.
pause