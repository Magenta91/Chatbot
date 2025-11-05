// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the ai-chat-platform database
db = db.getSiblingDB('ai-chat-platform');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        }
      }
    }
  }
});

db.createCollection('sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'userId'],
      properties: {
        sessionId: {
          bsonType: 'string'
        },
        userId: {
          bsonType: 'objectId'
        }
      }
    }
  }
});

db.createCollection('messages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'userId', 'role', 'content'],
      properties: {
        sessionId: {
          bsonType: 'string'
        },
        userId: {
          bsonType: 'objectId'
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'assistant', 'system', 'summary']
        },
        content: {
          bsonType: 'string',
          minLength: 1
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1, createdAt: -1 });
db.sessions.createIndex({ userId: 1, isActive: 1, lastActivityAt: -1 });

db.messages.createIndex({ sessionId: 1, createdAt: 1 });
db.messages.createIndex({ userId: 1, createdAt: -1 });
db.messages.createIndex({ sessionId: 1, role: 1, createdAt: 1 });

db.prompts.createIndex({ name: 1 }, { unique: true });
db.prompts.createIndex({ category: 1, isPublic: 1 });
db.prompts.createIndex({ createdBy: 1, isActive: 1 });

print('MongoDB initialization completed successfully');
print('Created collections: users, sessions, messages, prompts');
print('Created indexes for optimal query performance');