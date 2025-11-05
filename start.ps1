# AI Chat Platform Startup Script for Windows PowerShell

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    🤖 AI Chat Platform                      ║" -ForegroundColor Cyan
Write-Host "║                   Starting Full Stack App                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🔍 Checking requirements..." -ForegroundColor Yellow

# Check required files
$requiredFiles = @("package.json", "server/server.js", "client/package.json", ".env")
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Install backend dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Install frontend dependencies
if (!(Test-Path "client/node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
    Set-Location client
    npm install
    Set-Location ..
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "✅ All dependencies installed" -ForegroundColor Green

# Create logs directory
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "📁 Created logs directory" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🚀 Starting backend server..." -ForegroundColor Magenta

# Start backend in background
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node server/server.js
}

# Wait for backend to start
Start-Sleep -Seconds 5

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend server is running on http://localhost:4000" -ForegroundColor Green
    } else {
        throw "Backend health check failed"
    }
} catch {
    Write-Host "❌ Backend server failed to start" -ForegroundColor Red
    Stop-Job $backendJob
    Remove-Job $backendJob
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
node seed/seedDemo.js

Write-Host ""
Write-Host "🎨 Starting frontend server..." -ForegroundColor Magenta

# Start frontend in background
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD/client
    $env:BROWSER = "none"
    npm start
}

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to compile..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                        🎉 SUCCESS!                          ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Backend:  http://localhost:4000                             ║" -ForegroundColor Green
Write-Host "║  Frontend: http://localhost:3000                             ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Demo Accounts:                                              ║" -ForegroundColor Green
Write-Host "║  📧 demo@example.com / demo123                               ║" -ForegroundColor Green
Write-Host "║  📧 admin@example.com / demo123                              ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Press Ctrl+C or close this window to stop servers          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Open browser
try {
    Start-Process "http://localhost:3000"
    Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Could not open browser automatically" -ForegroundColor Yellow
    Write-Host "Please open http://localhost:3000 manually" -ForegroundColor Yellow
}

# Keep script running and monitor jobs
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running") {
            Write-Host "❌ Backend server stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        if ($frontendJob.State -ne "Running") {
            Write-Host "❌ Frontend server stopped unexpectedly" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "🛑 Shutting down servers..." -ForegroundColor Yellow
} finally {
    # Cleanup
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "👋 Goodbye!" -ForegroundColor Cyan
}