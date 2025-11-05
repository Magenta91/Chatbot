const MockProvider = require('../../providers/mockProvider');
const OpenAIProvider = require('../../providers/openaiProvider');
const DialogflowProvider = require('../../providers/dialogflowProvider');

describe('Provider Tests', () => {
  describe('MockProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new MockProvider();
    });

    test('should initialize correctly', () => {
      expect(provider.name).toBe('mock');
    });

    test('should generate response', async () => {
      const result = await provider.generateResponse({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'You are helpful'
      });

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('model');
      expect(result.usage).toHaveProperty('promptTokens');
      expect(result.usage).toHaveProperty('completionTokens');
      expect(result.usage).toHaveProperty('totalTokens');
    });

    test('should stream response', async () => {
      const tokens = [];
      let finalResult = null;

      await provider.streamResponse({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'You are helpful',
        onToken: (token) => tokens.push(token),
        onDone: (result) => { finalResult = result; }
      });

      expect(tokens.length).toBeGreaterThan(0);
      expect(finalResult).toHaveProperty('text');
      expect(finalResult).toHaveProperty('usage');
    });

    test('should handle errors gracefully', async () => {
      let errorCaught = null;

      await provider.streamResponse({
        messages: [{ role: 'user', content: 'Hello' }],
        onToken: () => { throw new Error('Test error'); },
        onError: (error) => { errorCaught = error; }
      });

      expect(errorCaught).toBeInstanceOf(Error);
    });

    test('should test connection successfully', async () => {
      const result = await provider.testConnection();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('mock');
    });
  });

  describe('Provider Interface Compliance', () => {
    const providers = [
      { name: 'MockProvider', class: MockProvider },
      { name: 'OpenAIProvider', class: OpenAIProvider },
      { name: 'DialogflowProvider', class: DialogflowProvider }
    ];

    providers.forEach(({ name, class: ProviderClass }) => {
      describe(`${name} Interface`, () => {
        let provider;

        beforeEach(() => {
          provider = new ProviderClass();
        });

        test('should have required properties', () => {
          expect(provider).toHaveProperty('name');
          expect(typeof provider.name).toBe('string');
        });

        test('should have required methods', () => {
          expect(typeof provider.streamResponse).toBe('function');
          expect(typeof provider.generateResponse).toBe('function');
          expect(typeof provider.testConnection).toBe('function');
        });

        test('generateResponse should return correct structure', async () => {
          if (name === 'MockProvider') {
            const result = await provider.generateResponse({
              messages: [{ role: 'user', content: 'Test' }]
            });

            expect(result).toHaveProperty('text');
            expect(result).toHaveProperty('usage');
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('model');
            
            expect(typeof result.text).toBe('string');
            expect(typeof result.usage).toBe('object');
            expect(result.usage).toHaveProperty('promptTokens');
            expect(result.usage).toHaveProperty('completionTokens');
            expect(result.usage).toHaveProperty('totalTokens');
          }
        });

        test('streamResponse should call callbacks', async () => {
          if (name === 'MockProvider') {
            let tokenCalled = false;
            let doneCalled = false;

            await provider.streamResponse({
              messages: [{ role: 'user', content: 'Test' }],
              onToken: () => { tokenCalled = true; },
              onDone: () => { doneCalled = true; }
            });

            expect(tokenCalled).toBe(true);
            expect(doneCalled).toBe(true);
          }
        });

        test('testConnection should return status object', async () => {
          const result = await provider.testConnection();
          
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('provider');
          expect(typeof result.success).toBe('boolean');
          expect(typeof result.provider).toBe('string');
        });
      });
    });
  });

  describe('Token Estimation', () => {
    let provider;

    beforeEach(() => {
      provider = new MockProvider();
    });

    test('should estimate tokens correctly', () => {
      const text = 'This is a test message';
      const estimated = provider._estimateTokens(text);
      
      expect(estimated).toBeGreaterThan(0);
      expect(estimated).toBe(Math.ceil(text.length / 4));
    });

    test('should handle empty text', () => {
      const estimated = provider._estimateTokens('');
      expect(estimated).toBe(0);
    });

    test('should handle null/undefined text', () => {
      expect(provider._estimateTokens(null)).toBe(0);
      expect(provider._estimateTokens(undefined)).toBe(0);
    });
  });
});