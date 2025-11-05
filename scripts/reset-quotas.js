const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../server/models/User');
const config = require('../server/config');

async function resetQuotas() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('📊 Resetting user quotas for free tier...');
    
    const result = await User.updateMany(
      {}, // Update all users
      {
        $set: {
          'quotas.dailyTokenLimit': 100000,
          'quotas.dailyRequestLimit': 1000,
          'quotas.resetDate': new Date(),
          'usage.totalTokens': 0,
          'usage.totalRequests': 0,
          'preferences.defaultProvider': 'mock',
          'preferences.defaultModel': 'mock-model-v1'
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with new quotas`);
    console.log('📋 New quotas:');
    console.log('   - Daily Token Limit: 100,000');
    console.log('   - Daily Request Limit: 1,000');
    console.log('   - Default Provider: Mock (free)');
    console.log('   - Usage Reset: Yes');

  } catch (error) {
    console.error('❌ Error resetting quotas:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

resetQuotas();