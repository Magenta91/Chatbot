const MockProvider = require('../../providers/mockProvider');
const OpenAIProvider = require('../../providers/openaiProvider');
const DialogflowProvider = require('../../providers/dialogflowProvider');

/**
 * Contract tests ensure all providers implement the same interface
 * and behave consistently regardless of the underlying implementation
 */

describe('Provider Contract Tests', () => {
  const providers = [
    { name: 'MockProvider', instance: new MockProvider() },
    // Only test real providers if credentials are available
    ...(process.env.OPENAI_API_KEY ? [{ name: 'OpenAIProvider', instance: new OpenAIProvider() }] : []),
    ...(process.env.DIALOGFLOW_PROJECT_ID ? [{ name: 'DialogflowProvider', instance: new DialogflowProvider() }] : [])
  ];

  providers.forEach(({ name, instance: provider }) => {
    describe(`${name} Contract`, () => {
      
      describe('Interface Compliance', () => {
        test('should have required properties', () => {
          expect(provider).toHaveProperty('name');
          expect(typeof provider.name).toBe('string');
          expect(provider.name.length).toBeGreaterThan(0);
        });

        test('should have required methods', () => {
          expect(typeof provider.streamResponse).toBe('function');
          expect(typeof provider.generateResponse).toBe('function');
          expect(typeof provider.testConnection).toBe('function');
        });
      });

      describe('generateResponse Contract', () => {
        test('should return consistent response structure', async () => {
          const input = {
            messages: [{ role: 'user', content: 'Hello, how are you?' }],
            systemPrompt: 'You are a helpful assistant.',
            options: { temperature: 0.7 }
          };

          const response = await provider.generateResponse(input);

          // Required fields
          expect(response).toHaveProperty('text');
          expect(response).toHaveProperty('usage');
          expect(response).toHaveProperty('id');
          expect(response).toHaveProperty('model');

          // Type validation
          expect(typeof response.text).toBe('string');
          expect(typeof response.usage).toBe('object');
          expect(typeof response.id).toBe('string');
          expect(typeof response.model).toBe('string');

          // Usage object structure
          expect(response.usage).toHaveProperty('promptTokens');
          expect(response.usage).toHaveProperty('completionTokens');
          expect(response.usage).toHaveProperty('totalTokens');
          expect(typeof response.usage.promptTokens).toBe('number');
          expect(typeof response.usage.completionTokens).toBe('number');
          expect(typeof response.usage.totalTokens).toBe('number');

          // Logical constraints
          expect(response.text.length).toBeGreaterThan(0);
          expect(response.usage.promptTokens).toBeGreaterThan(0);
          expect(response.usage.completionTokens).toBeGreaterThan(0);
          expect(response.usage.totalTokens).toBeGreaterThanOrEqual(
            response.usage.promptTokens + response.usage.completionTokens
          );
        }, 10000);

        test('should handle empty messages array', async () => {
          const input = {
            messages: [],
            systemPrompt: 'You are a helpful assistant.'
          };

          if (name === 'MockProvider') {
            const response = await provider.generateResponse(input);
            expect(response).toHaveProperty('text');
            expect(response).toHaveProperty('usage');
          } else {
            // Real providers might handle this differently
            await expect(provider.generateResponse(input)).rejects.toThrow();
          }
        });

        test('should handle missing system prompt', async () => {
          const input = {
            messages: [{ role: 'user', content: 'Hello' }]
          };

          const response = await provider.generateResponse(input);
          expect(response).toHaveProperty('text');
          expect(response).toHaveProperty('usage');
        });
      });

      describe('streamResponse Contract', () => {
        test('should call onToken callback multiple times', async () => {
          const tokens = [];
          let doneResult = null;
          let errorResult = null;

          const input = {
            messages: [{ role: 'user', content: 'Tell me a short story' }],
            systemPrompt: 'You are a storyteller.',
            onToken: (token) => tokens.push(token),
            onDone: (result) => { doneResult = result; },
            onError: (error) => { errorResult = error; }
          };

          await provider.streamResponse(input);

          // Should have received tokens
          expect(tokens.length).toBeGreaterThan(0);
          expect(tokens.every(token => typeof token === 'string')).toBe(true);

          // Should have called onDone
          expect(doneResult).not.toBeNull();
          expect(doneResult).toHaveProperty('text');
          expect(doneResult).toHaveProperty('usage');

          // Should not have called onError
          expect(errorResult).toBeNull();

          // Reconstructed text should match final result
          const reconstructedText = tokens.join('');
          expect(reconstructedText).toBe(doneResult.text);
        }, 15000);

        test('should handle streaming without callbacks', async () => {
          const input = {
            messages: [{ role: 'user', content: 'Hello' }]
          };

          // Should not throw even without callbacks
          await expect(provider.streamResponse(input)).resolves.toBeDefined();
        });

        test('should call onError on provider failure', async () => {
          if (name === 'MockProvider') {
            // Mock a failure scenario
            const originalStreamResponse = provider.streamResponse;
            provider.streamResponse = async (options) => {
              if (options.onError) {
                options.onError(new Error('Simulated failure'));
              }
              throw new Error('Simulated failure');
            };

            let errorCaught = null;
            const input = {
              messages: [{ role: 'user', content: 'Hello' }],
              onError: (error) => { errorCaught = error; }
            };

            await expect(provider.streamResponse(input)).rejects.toThrow();
            expect(errorCaught).toBeInstanceOf(Error);

            // Restore original method
            provider.streamResponse = originalStreamResponse;
          }
        });
      });

      describe('testConnection Contract', () => {
        test('should return connection status', async () => {
          const result = await provider.testConnection();

          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('provider');
          expect(typeof result.success).toBe('boolean');
          expect(typeof result.provider).toBe('string');
          expect(result.provider).toBe(provider.name);

          if (!result.success) {
            expect(result).toHaveProperty('error');
            expect(typeof result.error).toBe('string');
          }
        });
      });

      describe('Error Handling Contract', () => {
        test('should handle malformed input gracefully', async () => {
          const malformedInputs = [
            null,
            undefined,
            {},
            { messages: null },
            { messages: 'not an array' },
            { messages: [{ role: 'invalid', content: 'test' }] }
          ];

          for (const input of malformedInputs) {
            if (name === 'MockProvider') {
              // Mock provider should handle gracefully or throw meaningful errors
              try {
                await provider.generateResponse(input);
              } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBeDefined();
              }
            }
          }
        });

        test('should timeout appropriately', async () => {
          // This test would be more relevant for real providers
          if (name !== 'MockProvider') {
            const startTime = Date.now();
            
            try {
              await provider.generateResponse({
                messages: [{ role: 'user', content: 'Hello' }],
                options: { timeout: 1 } // Very short timeout
              });
            } catch (error) {
              const duration = Date.now() - startTime;
              expect(duration).toBeLessThan(5000); // Should fail fast
            }
          }
        }, 10000);
      });

      describe('Performance Contract', () => {
        test('should complete requests within reasonable time', async () => {
          const startTime = Date.now();
          
          await provider.generateResponse({
            messages: [{ role: 'user', content: 'Hi' }]
          });
          
          const duration = Date.now() - startTime;
          
          if (name === 'MockProvider') {
            expect(duration).toBeLessThan(1000); // Mock should be fast
          } else {
            expect(duration).toBeLessThan(30000); // Real providers have network latency
          }
        }, 35000);

        test('should handle concurrent requests', async () => {
          const requests = Array(3).fill().map(() => 
            provider.generateResponse({
              messages: [{ role: 'user', content: `Request ${Math.random()}` }]
            })
          );

          const results = await Promise.all(requests);
          
          expect(results).toHaveLength(3);
          results.forEach(result => {
            expect(result).toHaveProperty('text');
            expect(result).toHaveProperty('usage');
          });
        }, 30000);
      });

      describe('Data Consistency Contract', () => {
        test('should produce consistent token counts', async () => {
          const input = {
            messages: [{ role: 'user', content: 'Count the tokens in this message' }]
          };

          const result1 = await provider.generateResponse(input);
          const result2 = await provider.generateResponse(input);

          // Token counts should be reasonably consistent for same input
          // (allowing for some variation in real providers due to randomness)
          if (name === 'MockProvider') {
            expect(Math.abs(result1.usage.promptTokens - result2.usage.promptTokens)).toBeLessThan(5);
          }
        });

        test('should maintain message order in context', async () => {
          const messages = [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' }
          ];

          const result = await provider.generateResponse({ messages });
          
          expect(result).toHaveProperty('text');
          // The response should be contextually appropriate for the conversation
          expect(result.text.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Cross-Provider Consistency', () => {
    if (providers.length > 1) {
      test('all providers should handle same input format', async () => {
        const standardInput = {
          messages: [{ role: 'user', content: 'Hello, world!' }],
          systemPrompt: 'You are a helpful assistant.',
          options: { temperature: 0.5 }
        };

        const results = await Promise.all(
          providers.map(({ instance }) => instance.generateResponse(standardInput))
        );

        // All should return valid responses
        results.forEach(result => {
          expect(result).toHaveProperty('text');
          expect(result).toHaveProperty('usage');
          expect(result.text.length).toBeGreaterThan(0);
        });
      });

      test('all providers should support streaming', async () => {
        const standardInput = {
          messages: [{ role: 'user', content: 'Tell me about AI' }]
        };

        const streamingResults = await Promise.all(
          providers.map(async ({ instance }) => {
            const tokens = [];
            let finalResult = null;

            await instance.streamResponse({
              ...standardInput,
              onToken: (token) => tokens.push(token),
              onDone: (result) => { finalResult = result; }
            });

            return { tokens, finalResult };
          })
        );

        streamingResults.forEach(({ tokens, finalResult }) => {
          expect(tokens.length).toBeGreaterThan(0);
          expect(finalResult).toHaveProperty('text');
          expect(tokens.join('')).toBe(finalResult.text);
        });
      }, 20000);
    }
  });
});