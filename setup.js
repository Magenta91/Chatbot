#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function setup() {
  log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                    🤖 AI Chat Platform                      ║
║                    Complete Setup Script                    ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  try {
    // 1. Install dependencies
    log('\n📦 Installing dependencies...', colors.yellow);
    await runCommand('npm', ['install']);
    
    log('📦 Installing frontend dependencies...', colors.yellow);
    await runCommand('npm', ['install'], 'client');

    // 2. Create .env if it doesn't exist
    if (!fs.existsSync('.env')) {
      log('\n⚙️  Creating .env file...', colors.blue);
      fs.copyFileSync('.env.example', '.env');
      log('✅ Created .env file from template', colors.green);
      log('📝 Please edit .env file with your API keys', colors.yellow);
    }

    // 3. Create logs directory
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
      log('📁 Created logs directory', colors.blue);
    }

    // 4. Reset quotas and disable safety
    log('\n🔧 Configuring platform...', colors.blue);
    await runCommand('node', ['scripts/reset-quotas.js']);
    await runCommand('node', ['scripts/disable-safety.js']);

    // 5. Seed database
    log('\n🌱 Seeding database...', colors.yellow);
    await runCommand('node', ['seed/seedDemo.js']);

    // Success message
    log(`
${colors.green}╔══════════════════════════════════════════════════════════════╗
║                        🎉 SETUP COMPLETE!                   ║
║                                                              ║
║  Your AI Chat Platform is ready to use!                     ║
║                                                              ║
║  Next Steps:                                                 ║
║  1. Edit .env file with your OpenAI API key (optional)      ║
║  2. Run: npm start                                           ║
║  3. Open: http://localhost:3000                              ║
║  4. Login: demo@example.com / demo123                        ║
║                                                              ║
║  Features Ready:                                             ║
║  ✅ Real AI responses (OpenAI + Mock)                        ║
║  ✅ Streaming chat interface                                 ║
║  ✅ Session management                                       ║
║  ✅ Scrollable chat history                                  ║
║  ✅ Provider switching                                       ║
║  ✅ Export conversations                                     ║
║  ✅ Responsive design                                        ║
║                                                              ║
║  Commands:                                                   ║
║  • npm start          - Start full platform                 ║
║  • npm run dev        - Development mode                     ║
║  • npm test           - Run tests                            ║
║  • npm run seed       - Reseed database                     ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
    `);

  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, colors.red);
    log('\n🔧 Manual setup steps:', colors.yellow);
    log('1. npm install', colors.cyan);
    log('2. cd client && npm install', colors.cyan);
    log('3. cp .env.example .env', colors.cyan);
    log('4. npm run seed', colors.cyan);
    log('5. npm start', colors.cyan);
    process.exit(1);
  }
}

function runCommand(command, args, cwd = '.') {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows && command === 'npm' ? 'npm.cmd' : command;
    
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: isWindows
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run setup
setup();