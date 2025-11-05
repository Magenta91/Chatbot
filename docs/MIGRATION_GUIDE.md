# Migration Guide: Adding New AI Providers

This guide explains how to add new AI providers to the platform while maintaining compatibility with the existing provider interface.

## Provider Interface Contract

All providers must implement the following interface:

```javascript
class ProviderInterface {
  constructor() {
    this.name = 'provider-name'; // Unique identifier
  }

  /**
   * Stream response with real-time token delivery
   * @param {Object} params
   * @param {Array} params.messages - Conversation history
   * @param {string} params.systemPrompt - System instructions
   * @param {Object} params.options - Provider-specific options
   * @param {Function} params.onToken - Called for each token
   * @param {Function} params.onDone - Called when complete
   * @param {Function} params.onError - Called on error
   */
  async streamResponse({ messages, systemPrompt, options, onToken, onDone, onError }) {
    // Implementation required
  }

  /**
   * Generate complete response (non-streaming)
   * @param {Object} params
   * @param {Array} params.messages - Conversation history
   * @param {string} params.systemPrompt - System instructions
   * @param {Object} params.options - Provider-specific options
   * @returns {Object} Response with text, usage, id, model
   */
  async generateResponse({ messages, systemPrompt, options }) {
    // Implementation required
  }

  /**
   * Test provider connectivity and configuration
   * @returns {Object} { success: boolean, provider: string, error?: string }
   */
  async testConnection() {
    // Implementation required
  }
}
```

## Step-by-Step Implementation

### 1. Create Provider File

Create a new file in `server/providers/yourProvider.js`:

```javascript
const YourProviderSDK = require('your-provider-sdk');
const config = require('../config');

class YourProvider {
  constructor() {
    this.name = 'your-provider';
    this.client = new YourProviderSDK({
      apiKey: config.yourProvider.apiKey,
      // Other configuration
    });
  }

  async streamResponse({ messages, systemPrompt, options = {}, onToken, onDone, onError }) {
    try {
      // Format messages for your provider
      const formattedMessages = this._formatMessages(messages, systemPrompt);
      
      // Create streaming request
      const stream = await this.client.createStream({
        messages: formattedMessages,
        model: options.model || 'default-model',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000
      });

      let fullText = '';
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      // Process stream
      for await (const chunk of stream) {
        if (chunk.token) {
          fullText += chunk.token;
          if (onToken) {
            onToken(chunk.token);
          }
        }

        if (chunk.usage) {
          usage = this._normalizeUsage(chunk.usage);
        }
      }

      const result = {
        text: fullText,
        usage,
        id: `your-provider-${Date.now()}`,
        model: options.model || 'default-model'
      };

      if (onDone) {
        onDone(result);
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  async generateResponse({ messages, systemPrompt, options = {} }) {
    try {
      const formattedMessages = this._formatMessages(messages, systemPrompt);
      
      const response = await this.client.createCompletion({
        messages: formattedMessages,
        model: options.model || 'default-model',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000
      });

      return {
        text: response.text,
        usage: this._normalizeUsage(response.usage),
        id: response.id,
        model: response.model
      };
    } catch (error) {
      throw new Error(`Your Provider API error: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      // Test API connectivity
      await this.client.testConnection();
      return { success: true, provider: this.name };
    } catch (error) {
      return { success: false, provider: this.name, error: error.message };
    }
  }

  // Helper methods
  _formatMessages(messages, systemPrompt) {
    const formatted = [];
    
    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    messages.forEach(msg => {
      formatted.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    return formatted;
  }

  _normalizeUsage(usage) {
    // Normalize usage object to standard format
    return {
      promptTokens: usage.prompt_tokens || usage.inputTokens || 0,
      completionTokens: usage.completion_tokens || usage.outputTokens || 0,
      totalTokens: usage.total_tokens || usage.totalTokens || 0
    };
  }

  _estimateTokens(text) {
    // Rough estimation if provider doesn't provide token counts
    return Math.ceil((text || '').length / 4);
  }
}

module.exports = YourProvider;
```

### 2. Update Configuration

Add provider configuration to `server/config/index.js`:

```javascript
// Add to config object
yourProvider: {
  apiKey: process.env.YOUR_PROVIDER_API_KEY,
  model: process.env.YOUR_PROVIDER_MODEL || 'default-model',
  endpoint: process.env.YOUR_PROVIDER_ENDPOINT
},
```

### 3. Register Provider

Update `server/providers/index.js`:

```javascript
const YourProvider = require('./yourProvider');

class ProviderManager {
  _initializeProviders() {
    // Existing providers...

    // Add your provider
    if (config.yourProvider.apiKey) {
      this.providers.set('your-provider', new YourProvider());
    }
  }
}
```

### 4. Update Environment Variables

Add to `.env.example`:

```bash
# Your Provider Configuration
YOUR_PROVIDER_API_KEY=your_api_key_here
YOUR_PROVIDER_MODEL=default-model
YOUR_PROVIDER_ENDPOINT=https://api.yourprovider.com
```

### 5. Add Frontend Support

Update `client/src/components/SettingsPanel.js`:

```javascript
const providerOptions = [
  // Existing providers...
  { 
    value: 'your-provider', 
    label: 'Your Provider', 
    description: 'Description of your provider' 
  }
];

const modelOptions = {
  // Existing models...
  'your-provider': [
    { 
      value: 'model-1', 
      label: 'Model 1', 
      description: 'Fast and efficient' 
    },
    { 
      value: 'model-2', 
      label: 'Model 2', 
      description: 'Most capable' 
    }
  ]
};
```

### 6. Write Tests

Create `server/tests/unit/yourProvider.test.js`:

```javascript
const YourProvider = require('../../providers/yourProvider');

describe('YourProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new YourProvider();
  });

  test('should implement required interface', () => {
    expect(provider.name).toBe('your-provider');
    expect(typeof provider.streamResponse).toBe('function');
    expect(typeof provider.generateResponse).toBe('function');
    expect(typeof provider.testConnection).toBe('function');
  });

  test('should generate response', async () => {
    const result = await provider.generateResponse({
      messages: [{ role: 'user', content: 'Hello' }]
    });

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('usage');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('model');
  });

  // Add more tests...
});
```

### 7. Update Documentation

Add provider documentation to `docs/providers/your-provider.md`:

```markdown
# Your Provider Integration

## Configuration

Set the following environment variables:

- `YOUR_PROVIDER_API_KEY`: Your API key
- `YOUR_PROVIDER_MODEL`: Default model to use
- `YOUR_PROVIDER_ENDPOINT`: API endpoint (optional)

## Supported Models

- `model-1`: Fast and efficient model
- `model-2`: Most capable model

## Features

- ✅ Streaming responses
- ✅ Token usage tracking
- ✅ Error handling
- ❌ Function calling (not supported)

## Rate Limits

- 1000 requests per minute
- 100,000 tokens per day

## Error Codes

- `401`: Invalid API key
- `429`: Rate limit exceeded
- `500`: Internal server error
```

## Testing Your Provider

### 1. Unit Tests
```bash
npm test -- --testPathPattern=yourProvider
```

### 2. Contract Tests
```bash
npm test -- --testPathPattern=contract
```

### 3. Integration Tests
```bash
# Set your API key
export YOUR_PROVIDER_API_KEY=your_key

# Run integration tests
npm test -- --testPathPattern=integration
```

### 4. Manual Testing
```bash
# Start the server
npm run dev

# Test provider endpoint
curl -X GET http://localhost:4000/api/v1/providers

# Create session with your provider
curl -X POST http://localhost:4000/api/v1/chat/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"provider": "your-provider", "model": "model-1"}'
```

## Common Patterns

### Error Handling
```javascript
async generateResponse({ messages, systemPrompt, options }) {
  try {
    const response = await this.client.createCompletion(params);
    return this._normalizeResponse(response);
  } catch (error) {
    // Log error for debugging
    console.error('Provider error:', error);
    
    // Throw normalized error
    throw new Error(`Your Provider API error: ${error.message}`);
  }
}
```

### Rate Limiting
```javascript
async generateResponse(params) {
  // Check rate limits before making request
  if (this._isRateLimited()) {
    throw new Error('Rate limit exceeded');
  }

  // Make request and update rate limit counters
  const response = await this._makeRequest(params);
  this._updateRateLimit();
  
  return response;
}
```

### Caching
```javascript
async generateResponse(params) {
  // Check cache first
  const cacheKey = this._getCacheKey(params);
  const cached = await this._getFromCache(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Make request and cache result
  const response = await this._makeRequest(params);
  await this._setCache(cacheKey, response);
  
  return response;
}
```

## Best Practices

### 1. Error Handling
- Always wrap API calls in try-catch blocks
- Provide meaningful error messages
- Include provider-specific error codes
- Implement retry logic for transient errors

### 2. Token Estimation
- Provide accurate token counts when available
- Implement fallback estimation for providers without token counts
- Consider different tokenization methods

### 3. Streaming
- Handle connection interruptions gracefully
- Implement proper cleanup on stream end
- Support cancellation tokens

### 4. Configuration
- Use environment variables for all configuration
- Provide sensible defaults
- Validate configuration on startup

### 5. Testing
- Mock external API calls in unit tests
- Test error conditions and edge cases
- Verify interface compliance with contract tests

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correct
   - Check if key has required permissions
   - Ensure endpoint URL is correct

2. **Rate Limiting**
   - Implement exponential backoff
   - Monitor usage and adjust limits
   - Consider request queuing

3. **Streaming Issues**
   - Check network connectivity
   - Verify streaming format compatibility
   - Handle partial responses gracefully

4. **Token Count Mismatches**
   - Verify tokenization method
   - Account for special tokens
   - Implement estimation fallbacks

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
npm run dev
```

This will show detailed provider interactions and help identify issues.

## Migration Checklist

- [ ] Provider class implements required interface
- [ ] Configuration added to config file
- [ ] Provider registered in provider manager
- [ ] Environment variables documented
- [ ] Frontend UI updated
- [ ] Unit tests written
- [ ] Contract tests pass
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Error handling implemented
- [ ] Rate limiting considered
- [ ] Streaming support verified

## Support

If you encounter issues while implementing a new provider:

1. Check the existing provider implementations for reference
2. Review the contract tests to understand requirements
3. Enable debug logging to trace issues
4. Create an issue with detailed error information

The provider interface is designed to be flexible while maintaining consistency. Most AI providers can be integrated with minimal effort by following this guide.