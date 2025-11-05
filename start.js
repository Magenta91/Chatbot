#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logWithPrefix(prefix, message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}[${prefix}]${colors.reset} ${message}`);
}

// Check if required files exist
function checkRequirements() {
  log('\n🔍 Checking requirements...', colors.yellow);
  
  const requiredFiles = [
    'package.json',
    'server/server.js',
    'client/package.json',
    '.env'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ Missing required file: ${file}`, colors.red);
      process.exit(1);
    }
  }

  log('✅ All required files found', colors.green);
}

// Install dependencies if needed
function installDependencies() {
  return new Promise((resolve, reject) => {
    log('\n📦 Checking dependencies...', colors.yellow);
    
    // Handle Windows npm path issues
    const isWindows = process.platform === 'win32';
    const npmCommand = isWindows ? 'npm.cmd' : 'npm';
    
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      log('Installing backend dependencies...', colors.blue);
      const backendInstall = spawn(npmCommand, ['install'], { 
        stdio: 'inherit',
        shell: isWindows
      });
      
      backendInstall.on('close', (code) => {
        if (code !== 0) {
          log('❌ Failed to install backend dependencies', colors.red);
          reject(new Error('Backend dependency installation failed'));
          return;
        }
        
        // Install frontend dependencies
        if (!fs.existsSync('client/node_modules')) {
          log('Installing frontend dependencies...', colors.blue);
          const frontendInstall = spawn(npmCommand, ['install'], { 
            cwd: 'client',
            stdio: 'inherit',
            shell: isWindows
          });
          
          frontendInstall.on('close', (code) => {
            if (code !== 0) {
              log('❌ Failed to install frontend dependencies', colors.red);
              reject(new Error('Frontend dependency installation failed'));
              return;
            }
            log('✅ All dependencies installed', colors.green);
            resolve();
          });
        } else {
          log('✅ Frontend dependencies already installed', colors.green);
          resolve();
        }
      });
    } else if (!fs.existsSync('client/node_modules')) {
      log('Installing frontend dependencies...', colors.blue);
      const frontendInstall = spawn(npmCommand, ['install'], { 
        cwd: 'client',
        stdio: 'inherit',
        shell: isWindows
      });
      
      frontendInstall.on('close', (code) => {
        if (code !== 0) {
          log('❌ Failed to install frontend dependencies', colors.red);
          reject(new Error('Frontend dependency installation failed'));
          return;
        }
        log('✅ All dependencies installed', colors.green);
        resolve();
      });
    } else {
      log('✅ All dependencies already installed', colors.green);
      resolve();
    }
  });
}

// Create logs directory
function createLogsDirectory() {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
    log('📁 Created logs directory', colors.blue);
  }
}

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    log('\n🚀 Starting backend server...', colors.magenta);
    
    const backend = spawn('node', ['server/server.js'], {
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let backendReady = false;

    backend.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logWithPrefix('BACKEND', message, colors.blue);
        
        // Check if backend is ready
        if (message.includes('Server running on port') && !backendReady) {
          backendReady = true;
          resolve(backend);
        }
      }
    });

    backend.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !message.includes('DeprecationWarning')) {
        logWithPrefix('BACKEND', message, colors.red);
      }
    });

    backend.on('close', (code) => {
      if (code !== 0 && !backendReady) {
        log(`❌ Backend exited with code ${code}`, colors.red);
        reject(new Error(`Backend process exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backendReady) {
        log('❌ Backend startup timeout', colors.red);
        backend.kill();
        reject(new Error('Backend startup timeout'));
      }
    }, 30000);
  });
}

// Start frontend server
function startFrontend() {
  return new Promise((resolve, reject) => {
    log('\n🎨 Starting frontend server...', colors.magenta);
    
    // Handle Windows npm path issues
    const isWindows = process.platform === 'win32';
    const npmCommand = isWindows ? 'npm.cmd' : 'npm';
    
    const frontend = spawn(npmCommand, ['start'], {
      cwd: 'client',
      env: { ...process.env, BROWSER: 'none' }, // Prevent auto-opening browser
      shell: isWindows // Use shell on Windows
    });

    let frontendReady = false;

    frontend.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logWithPrefix('FRONTEND', message, colors.green);
        
        // Check if frontend is ready
        if ((message.includes('webpack compiled') || message.includes('Local:')) && !frontendReady) {
          frontendReady = true;
          resolve(frontend);
        }
      }
    });

    frontend.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !message.includes('DeprecationWarning')) {
        logWithPrefix('FRONTEND', message, colors.yellow);
      }
    });

    frontend.on('close', (code) => {
      if (code !== 0 && !frontendReady) {
        log(`❌ Frontend exited with code ${code}`, colors.red);
        reject(new Error(`Frontend process exited with code ${code}`));
      }
    });

    // Timeout after 60 seconds (frontend takes longer)
    setTimeout(() => {
      if (!frontendReady) {
        log('❌ Frontend startup timeout', colors.red);
        frontend.kill();
        reject(new Error('Frontend startup timeout'));
      }
    }, 60000);
  });
}

// Seed database
function seedDatabase() {
  return new Promise((resolve, reject) => {
    log('\n🌱 Seeding database...', colors.yellow);
    
    const isWindows = process.platform === 'win32';
    const seed = spawn('node', ['seed/seedDemo.js'], { 
      stdio: 'inherit',
      shell: isWindows
    });
    
    seed.on('close', (code) => {
      if (code === 0) {
        log('✅ Database seeded successfully', colors.green);
        resolve();
      } else {
        log('⚠️  Database seeding failed, continuing anyway...', colors.yellow);
        resolve(); // Continue even if seeding fails
      }
    });
  });
}

// Main startup function
async function start() {
  try {
    log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                    🤖 AI Chat Platform                      ║
║                   Starting Full Stack App                   ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
    `);

    // Check requirements
    checkRequirements();

    // Create logs directory
    createLogsDirectory();

    // Install dependencies
    await installDependencies();

    // Start backend
    const backendProcess = await startBackend();

    // Wait a bit for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Seed database
    await seedDatabase();

    // Start frontend
    const frontendProcess = await startFrontend();

    // Success message
    log(`
${colors.green}╔══════════════════════════════════════════════════════════════╗
║                        🎉 SUCCESS!                          ║
║                                                              ║
║  Backend:  http://localhost:4000                             ║
║  Frontend: http://localhost:3000                             ║
║                                                              ║
║  Demo Accounts:                                              ║
║  📧 demo@example.com / demo123                               ║
║  📧 admin@example.com / demo123                              ║
║                                                              ║
║  Press Ctrl+C to stop both servers                          ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
    `);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down servers...', colors.yellow);
      
      if (backendProcess) {
        backendProcess.kill('SIGTERM');
      }
      
      if (frontendProcess) {
        frontendProcess.kill('SIGTERM');
      }
      
      setTimeout(() => {
        log('👋 Goodbye!', colors.cyan);
        process.exit(0);
      }, 2000);
    });

    process.on('SIGTERM', () => {
      log('\n🛑 Received SIGTERM, shutting down...', colors.yellow);
      
      if (backendProcess) {
        backendProcess.kill('SIGTERM');
      }
      
      if (frontendProcess) {
        frontendProcess.kill('SIGTERM');
      }
      
      process.exit(0);
    });

  } catch (error) {
    log(`\n❌ Startup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Start the application
start();