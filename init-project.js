#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('🚀 Initializing AI Chat Platform...\n');

// Create required directories
const directories = ['logs'];

console.log('📁 Creating required directories...');
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}/`);
  } else {
    console.log(`✓ Already exists: ${dir}/`);
  }
});

// Generate JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Create root .env file if it doesn't exist
const rootEnvPath = '.env';
if (!fs.existsSync(rootEnvPath)) {
  console.log('\n📝 Creating root .env file...');
  const rootEnvContent = `# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-chat-platform

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# AI Provider Configuration
AI_PROVIDER=mock

# OpenAI Configuration (optional)
# OPENAI_API_KEY=your-openai-api-key-here
# OPENAI_MODEL=gpt-3.5-turbo

# Google Dialogflow Configuration (optional)
# DIALOGFLOW_PROJECT_ID=your-project-id
# DIALOGFLOW_LANGUAGE_CODE=en
# GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Redis Configuration (optional)
# REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Safety & Moderation
ENABLE_CONTENT_SAFETY=true
SAFETY_THRESHOLD=0.7

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
`;
  
  fs.writeFileSync(rootEnvPath, rootEnvContent);
  console.log('✅ Created: .env');
  console.log(`   Generated JWT_SECRET: ${jwtSecret.substring(0, 20)}...`);
} else {
  console.log('\n✓ Root .env file already exists');
}

// Create client .env file if it doesn't exist
const clientEnvPath = 'client/.env';
if (!fs.existsSync(clientEnvPath)) {
  console.log('\n📝 Creating client/.env file...');
  const clientEnvContent = `REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000
`;
  
  fs.writeFileSync(clientEnvPath, clientEnvContent);
  console.log('✅ Created: client/.env');
} else {
  console.log('\n✓ Client .env file already exists');
}

// Check if node_modules exists
console.log('\n📦 Checking dependencies...');
if (!fs.existsSync('node_modules')) {
  console.log('Installing root dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Root dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install root dependencies');
    console.error('   Please run: npm install');
  }
} else {
  console.log('✓ Root dependencies already installed');
}

if (!fs.existsSync('client/node_modules')) {
  console.log('Installing client dependencies...');
  try {
    execSync('npm install', { cwd: 'client', stdio: 'inherit' });
    console.log('✅ Client dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install client dependencies');
    console.error('   Please run: cd client && npm install');
  }
} else {
  console.log('✓ Client dependencies already installed');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Project initialization complete!');
console.log('='.repeat(60));

console.log('\n📋 Next Steps:\n');
console.log('1. Start MongoDB:');
console.log('   - Local: net start MongoDB (Windows) or sudo systemctl start mongod (Linux)');
console.log('   - Docker: docker run -d -p 27017:27017 mongo:latest');
console.log('   - Docker Compose: docker-compose up -d\n');

console.log('2. Seed the database:');
console.log('   npm run seed\n');

console.log('3. Start the application:');
console.log('   npm start\n');

console.log('4. Open your browser:');
console.log('   http://localhost:3000\n');

console.log('5. Login with demo credentials:');
console.log('   Email: demo@example.com');
console.log('   Password: demo123\n');

console.log('📚 For more details, see SETUP_FOR_NEW_USERS.md\n');

console.log('🔑 Your JWT Secret (first 20 chars): ' + jwtSecret.substring(0, 20) + '...');
console.log('   (Full secret saved in .env file)\n');
