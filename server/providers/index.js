const OpenAIProvider = require('./openaiProvider');
const DialogflowProvider = require('./dialogflowProvider');
const MockProvider = require('./mockProvider');
const config = require('../config');

class ProviderManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'mock';
    
    this._initializeProviders();
  }

  _initializeProviders() {
    // Always initialize mock provider
    this.providers.set('mock', new MockProvider());

    // Initialize OpenAI if API key is available
    if (config.openai.apiKey) {
      this.providers.set('openai', new OpenAIProvider());
      this.defaultProvider = 'openai';
    }

    // Initialize Dialogflow if enabled and credentials are available
    if (config.useDialogflow && config.dialogflow.projectId && config.dialogflow.credentials) {
      this.providers.set('dialogflow', new DialogflowProvider());
    }
  }

  getProvider(name) {
    if (!name) {
      name = this.defaultProvider;
    }
    
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found or not configured`);
    }
    
    return provider;
  }

  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  async testAllProviders() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.testConnection();
      } catch (error) {
        results[name] = { success: false, provider: name, error: error.message };
      }
    }
    
    return results;
  }

  // Fallback mechanism for provider errors
  async getWorkingProvider(preferredProvider) {
    const providers = [preferredProvider, this.defaultProvider, 'mock'].filter(Boolean);
    
    for (const providerName of providers) {
      try {
        const provider = this.getProvider(providerName);
        const test = await provider.testConnection();
        if (test.success) {
          return provider;
        }
      } catch (error) {
        continue;
      }
    }
    
    // Always return mock as final fallback
    return this.getProvider('mock');
  }
}

module.exports = new ProviderManager();