const { SessionsClient } = require('@google-cloud/dialogflow');
const config = require('../config');

class DialogflowProvider {
  constructor() {
    this.name = 'dialogflow';
    this.client = new SessionsClient({
      keyFilename: config.dialogflow.credentials
    });
    this.projectId = config.dialogflow.projectId;
  }

  async streamResponse({ messages, systemPrompt, options = {}, onToken, onDone, onError }) {
    try {
      // Dialogflow doesn't natively support streaming, so we simulate it
      const result = await this.generateResponse({ messages, systemPrompt, options });
      
      // Simulate streaming by breaking response into chunks
      const words = result.text.split(' ');
      let streamedText = '';
      
      for (let i = 0; i < words.length; i++) {
        const token = i === 0 ? words[i] : ' ' + words[i];
        streamedText += token;
        
        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (onToken) {
          onToken(token);
        }
      }

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
      // Use the last user message for Dialogflow
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        throw new Error('No user message found');
      }

      const sessionId = options.sessionId || 'default-session';
      const sessionPath = this.client.projectAgentSessionPath(this.projectId, sessionId);

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: lastUserMessage.content,
            languageCode: 'en-US'
          }
        }
      };

      // Add context from system prompt if provided
      if (systemPrompt) {
        request.queryParams = {
          contexts: [{
            name: `${sessionPath}/contexts/system-context`,
            lifespanCount: 1,
            parameters: {
              systemPrompt: systemPrompt
            }
          }]
        };
      }

      const [response] = await this.client.detectIntent(request);
      const result = response.queryResult;

      const usage = {
        promptTokens: this._estimateTokens(lastUserMessage.content + (systemPrompt || '')),
        completionTokens: this._estimateTokens(result.fulfillmentText),
        totalTokens: 0
      };
      usage.totalTokens = usage.promptTokens + usage.completionTokens;

      return {
        text: result.fulfillmentText || 'I apologize, but I could not generate a response.',
        usage,
        id: `dialogflow-${Date.now()}`,
        model: 'dialogflow-es',
        confidence: result.intentDetectionConfidence,
        intent: result.intent?.displayName
      };
    } catch (error) {
      throw new Error(`Dialogflow API error: ${error.message}`);
    }
  }

  _estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil((text || '').length / 4);
  }

  async testConnection() {
    try {
      const sessionPath = this.client.projectAgentSessionPath(this.projectId, 'test-session');
      
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: 'test',
            languageCode: 'en-US'
          }
        }
      };

      await this.client.detectIntent(request);
      return { success: true, provider: 'dialogflow' };
    } catch (error) {
      return { success: false, provider: 'dialogflow', error: error.message };
    }
  }
}

module.exports = DialogflowProvider;