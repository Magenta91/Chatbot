@echo off
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🤖 AI Chat Platform                      ║
echo ║                   Starting Full Stack App                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available
echo.

REM Try the Node.js startup script first
echo 🚀 Attempting to start with Node.js script...
node start.js

REM If that fails, try PowerShell script
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Node.js script failed, trying PowerShell script...
    powershell -ExecutionPolicy Bypass -File start.ps1
)

pause