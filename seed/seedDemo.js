const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import models
const User = require('../server/models/User');
const Session = require('../server/models/Session');
const Message = require('../server/models/Message');
const Prompt = require('../server/models/Prompt');

const config = require('../server/config');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out for production)
    if (process.env.NODE_ENV !== 'production') {
      await User.deleteMany({});
      await Session.deleteMany({});
      await Message.deleteMany({});
      await Prompt.deleteMany({});
      console.log('🧹 Cleared existing data');
    }

    // Create demo users
    const demoUsers = await createDemoUsers();
    console.log(`👥 Created ${demoUsers.length} demo users`);

    // Create demo prompts
    const demoPrompts = await createDemoPrompts(demoUsers[0]._id);
    console.log(`📝 Created ${demoPrompts.length} demo prompts`);

    // Create demo sessions and messages
    const demoSessions = await createDemoSessions(demoUsers);
    console.log(`💬 Created ${demoSessions.length} demo sessions`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Accounts:');
    demoUsers.forEach(user => {
      console.log(`   Email: ${user.email} | Password: demo123`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

async function createDemoUsers() {
  const users = [
    {
      username: 'demo_user',
      email: 'demo@example.com',
      password: 'demo123',
      role: 'user',
      preferences: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.'
      },
      quotas: {
        dailyTokenLimit: 100000,
        dailyRequestLimit: 1000,
        resetDate: new Date()
      }
    },
    {
      username: 'admin_user',
      email: 'admin@example.com',
      password: 'demo123',
      role: 'admin',
      preferences: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.5,
        systemPrompt: 'You are an AI assistant helping with administrative tasks.'
      },
      quotas: {
        dailyTokenLimit: 100000,
        dailyRequestLimit: 1000,
        resetDate: new Date()
      }
    },
    {
      username: 'test_user',
      email: 'test@example.com',
      password: 'demo123',
      role: 'user',
      preferences: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        defaultTemperature: 0.8,
        systemPrompt: 'You are a conversational AI focused on customer support.'
      },
      quotas: {
        dailyTokenLimit: 100000,
        dailyRequestLimit: 1000,
        resetDate: new Date()
      }
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
  }

  return createdUsers;
}

async function createDemoPrompts(userId) {
  const prompts = [
    {
      name: 'helpful-assistant',
      description: 'A general-purpose helpful assistant prompt',
      content: 'You are a helpful, harmless, and honest AI assistant. Provide accurate and useful information while being concise and clear.',
      category: 'system',
      isPublic: true,
      createdBy: userId
    },
    {
      name: 'code-reviewer',
      description: 'AI assistant specialized in code review',
      content: 'You are an expert code reviewer. Analyze the provided code for bugs, performance issues, security vulnerabilities, and best practices. Provide constructive feedback with specific suggestions for improvement.',
      category: 'system',
      variables: [
        {
          name: 'language',
          description: 'Programming language',
          type: 'string',
          required: true
        }
      ],
      tags: ['coding', 'review', 'development'],
      isPublic: true,
      createdBy: userId
    },
    {
      name: 'conversation-summarizer',
      description: 'Summarizes long conversations while preserving key context',
      content: 'Summarize the following conversation concisely while preserving all important context, decisions made, and action items. Focus on key information that would be needed to continue the conversation naturally.',
      category: 'summarization',
      isPublic: false,
      createdBy: userId
    },
    {
      name: 'creative-writer',
      description: 'AI assistant for creative writing tasks',
      content: 'You are a creative writing assistant. Help with {{task}} by providing imaginative, engaging, and well-structured content. Consider the target audience of {{audience}} and maintain a {{tone}} tone throughout.',
      category: 'user',
      variables: [
        {
          name: 'task',
          description: 'Type of writing task',
          type: 'string',
          required: true
        },
        {
          name: 'audience',
          description: 'Target audience',
          type: 'string',
          defaultValue: 'general readers'
        },
        {
          name: 'tone',
          description: 'Writing tone',
          type: 'string',
          defaultValue: 'friendly'
        }
      ],
      tags: ['writing', 'creative', 'content'],
      isPublic: true,
      createdBy: userId
    },
    {
      name: 'safety-filter',
      description: 'Content safety and moderation prompt',
      content: 'Analyze the following content for safety issues including harmful, inappropriate, or policy-violating material. Provide a safety assessment and recommendations.',
      category: 'safety',
      isPublic: false,
      createdBy: userId
    }
  ];

  const createdPrompts = [];
  for (const promptData of prompts) {
    const prompt = new Prompt(promptData);
    await prompt.save();
    createdPrompts.push(prompt);
  }

  return createdPrompts;
}

async function createDemoSessions(users) {
  const sessions = [];

  // Create sessions for each user
  for (const user of users) {
    // Session 1: General conversation
    const session1Id = uuidv4();
    const session1 = new Session({
      sessionId: session1Id,
      userId: user._id,
      title: 'Getting Started with AI',
      provider: user.preferences.defaultProvider,
      model: user.preferences.defaultModel,
      systemPrompt: user.preferences.systemPrompt,
      settings: {
        temperature: user.preferences.defaultTemperature,
        maxTokens: 1000
      }
    });
    await session1.save();
    sessions.push(session1);

    // Add messages to session 1
    const messages1 = [
      {
        sessionId: session1Id,
        userId: user._id,
        role: 'user',
        content: 'Hello! Can you help me understand what you can do?',
        metadata: {
          provider: session1.provider,
          model: session1.model,
          tokenCount: 12
        }
      },
      {
        sessionId: session1Id,
        userId: user._id,
        role: 'assistant',
        content: 'Hello! I\'m an AI assistant that can help you with a wide variety of tasks including answering questions, helping with analysis, creative writing, coding assistance, and much more. What would you like to explore today?',
        metadata: {
          provider: session1.provider,
          model: session1.model,
          tokenCount: 45,
          usage: {
            promptTokens: 25,
            completionTokens: 45,
            totalTokens: 70
          }
        }
      },
      {
        sessionId: session1Id,
        userId: user._id,
        role: 'user',
        content: 'That sounds great! Can you help me write a short poem about technology?',
        metadata: {
          provider: session1.provider,
          model: session1.model,
          tokenCount: 16
        }
      },
      {
        sessionId: session1Id,
        userId: user._id,
        role: 'assistant',
        content: 'Certainly! Here\'s a short poem about technology:\n\nSilicon dreams and digital streams,\nConnecting worlds through glowing screens.\nData flows like rivers wide,\nWith algorithms as our guide.\n\nIn circuits small, great power lies,\nTransforming how humanity flies.\nFrom earth to cloud, from thought to code,\nTechnology lights our forward road.',
        metadata: {
          provider: session1.provider,
          model: session1.model,
          tokenCount: 68,
          usage: {
            promptTokens: 95,
            completionTokens: 68,
            totalTokens: 163
          }
        }
      }
    ];

    for (const messageData of messages1) {
      const message = new Message(messageData);
      await message.save();
    }

    // Update session context
    session1.context.totalTokens = 233;
    session1.context.messageCount = 4;
    await session1.save();

    // Session 2: Technical discussion
    if (user.role === 'admin' || user.username === 'demo_user') {
      const session2Id = uuidv4();
      const session2 = new Session({
        sessionId: session2Id,
        userId: user._id,
        title: 'JavaScript Best Practices',
        provider: 'mock',
        model: 'mock-model-v1',
        systemPrompt: 'You are a senior JavaScript developer providing code review and best practices guidance.',
        settings: {
          temperature: 0.3,
          maxTokens: 1500
        }
      });
      await session2.save();
      sessions.push(session2);

      // Add messages to session 2
      const messages2 = [
        {
          sessionId: session2Id,
          userId: user._id,
          role: 'user',
          content: 'Can you review this JavaScript function and suggest improvements?\n\nfunction getData(url) {\n  var xhr = new XMLHttpRequest();\n  xhr.open("GET", url, false);\n  xhr.send();\n  return JSON.parse(xhr.responseText);\n}',
          metadata: {
            provider: session2.provider,
            model: session2.model,
            tokenCount: 45
          }
        },
        {
          sessionId: session2Id,
          userId: user._id,
          role: 'assistant',
          content: 'I can see several areas for improvement in this function:\n\n1. **Avoid synchronous XMLHttpRequest**: The `false` parameter makes this blocking, which freezes the browser.\n2. **No error handling**: The function will throw if the request fails or returns invalid JSON.\n3. **Use modern fetch API**: XMLHttpRequest is outdated.\n\nHere\'s an improved version:\n\n```javascript\nasync function getData(url) {\n  try {\n    const response = await fetch(url);\n    if (!response.ok) {\n      throw new Error(`HTTP error! status: ${response.status}`);\n    }\n    return await response.json();\n  } catch (error) {\n    console.error(\'Failed to fetch data:\', error);\n    throw error;\n  }\n}\n```\n\nThis version is asynchronous, includes proper error handling, and uses modern JavaScript features.',
          metadata: {
            provider: session2.provider,
            model: session2.model,
            tokenCount: 142,
            usage: {
              promptTokens: 65,
              completionTokens: 142,
              totalTokens: 207
            }
          }
        }
      ];

      for (const messageData of messages2) {
        const message = new Message(messageData);
        await message.save();
      }

      // Update session context
      session2.context.totalTokens = 207;
      session2.context.messageCount = 2;
      await session2.save();
    }
  }

  return sessions;
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };