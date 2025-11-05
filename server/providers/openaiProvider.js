const OpenAI = require('openai');
const config = require('../config');

class OpenAIProvider {
  constructor() {
    this.name = 'openai';
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  async streamResponse({ messages, systemPrompt, options = {}, onToken, onDone, onError }) {
    try {
      const formattedMessages = this._formatMessages(messages, systemPrompt);
      
      // Use free tier appropriate settings
      const model = options.model || config.openai.model;
      const maxTokens = Math.min(options.maxTokens || config.openai.maxTokens, config.openai.maxTokensFreeTier || 500);
      
      const stream = await this.client.chat.completions.create({
        model: model,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature: options.temperature || config.openai.temperature,
        stream: true
      });

      let fullText = '';
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          fullText += delta.content;
          if (onToken) {
            onToken(delta.content);
          }
        }

        // OpenAI provides usage in the last chunk
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens
          };
        }
      }

      // Estimate tokens if not provided
      if (usage.totalTokens === 0) {
        usage.completionTokens = this._estimateTokens(fullText);
        usage.promptTokens = this._estimateTokens(formattedMessages.map(m => m.content).join(' '));
        usage.totalTokens = usage.promptTokens + usage.completionTokens;
      }

      const result = {
        text: fullText,
        usage,
        id: `openai-${Date.now()}`,
        model: options.model || config.openai.model
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
      
      // Use free tier appropriate settings
      const model = options.model || config.openai.model;
      const maxTokens = Math.min(options.maxTokens || config.openai.maxTokens, config.openai.maxTokensFreeTier || 500);
      
      const response = await this.client.chat.completions.create({
        model: model,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature: options.temperature || config.openai.temperature
      });

      const choice = response.choices[0];
      const usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      };

      return {
        text: choice.message.content,
        usage,
        id: response.id,
        model: response.model
      };
    } catch (error) {
      // Handle free tier specific errors
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please wait a moment before trying again.');
      } else if (error.status === 401) {
        throw new Error('OpenAI API key is invalid or expired.');
      } else if (error.status === 403) {
        throw new Error('OpenAI API access denied. Check your API key permissions.');
      } else if (error.message?.includes('quota')) {
        throw new Error('OpenAI quota exceeded. Please check your usage limits.');
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

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

  _estimateTokens(text) {
    // Rough estimation for OpenAI: ~4 characters per token
    return Math.ceil((text || '').length / 4);
  }

  async testConnection() {
    try {
      await this.client.models.list();
      return { success: true, provider: 'openai' };
    } catch (error) {
      return { success: false, provider: 'openai', error: error.message };
    }
  }
}

module.exports = OpenAIProvider;