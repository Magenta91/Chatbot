const { v4: uuidv4 } = require('uuid');

class MockProvider {
  constructor() {
    this.name = 'mock';
  }

  async streamResponse({ messages, systemPrompt, options = {}, onToken, onDone, onError }) {
    try {
      const mockResponses = [
        "Hello! I'm your AI assistant. I can help you with questions, provide information, assist with coding, writing, analysis, and much more. What would you like to know?",
        "I'm here to help! I can assist with a wide variety of tasks including answering questions, explaining concepts, helping with code, creative writing, problem-solving, and general conversation. How can I assist you today?",
        "Great question! I'm an AI assistant designed to be helpful, harmless, and honest. I can help with research, writing, coding, math, creative tasks, and general conversation. What specific topic would you like to explore?",
        "I'd be happy to help! As an AI assistant, I can provide information, answer questions, help with analysis, assist with creative tasks, explain complex topics, and engage in meaningful conversation. What can I help you with?",
        "Thank you for your message! I'm an AI assistant capable of helping with various tasks like answering questions, providing explanations, assisting with code and technical issues, creative writing, problem-solving, and more. How may I assist you today?"
      ];

      const selectedResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const words = selectedResponse.split(' ');
      
      let tokenCount = 0;
      
      for (let i = 0; i < words.length; i++) {
        const token = i === 0 ? words[i] : ' ' + words[i];
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (onToken) {
          onToken(token);
        }
        tokenCount++;
      }

      const usage = {
        promptTokens: this._estimateTokens(messages.map(m => m.content).join(' ') + (systemPrompt || '')),
        completionTokens: tokenCount,
        totalTokens: 0
      };
      usage.totalTokens = usage.promptTokens + usage.completionTokens;

      if (onDone) {
        onDone({ 
          text: selectedResponse, 
          usage,
          id: uuidv4(),
          model: 'mock-model-v1'
        });
      }

      return { text: selectedResponse, usage };
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  async generateResponse({ messages, systemPrompt, options = {} }) {
    // Get the last user message to provide contextual responses
    const lastMessage = messages.filter(m => m.role === 'user').pop();
    const userInput = lastMessage ? lastMessage.content.toLowerCase() : '';
    
    let response = '';
    
    // Provide contextual responses based on user input
    if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('hey')) {
      response = "Hello! I'm your AI assistant. I'm here to help you with any questions or tasks you might have. What would you like to know or discuss today?";
    } else if (userInput.includes('help') || userInput.includes('what can you do')) {
      response = "I can help you with a wide variety of tasks including:\n\n• Answering questions and providing information\n• Explaining complex concepts\n• Helping with coding and technical problems\n• Creative writing and content creation\n• Problem-solving and analysis\n• General conversation and discussion\n\nWhat specific area would you like assistance with?";
    } else if (userInput.includes('code') || userInput.includes('programming') || userInput.includes('javascript') || userInput.includes('python')) {
      response = "I'd be happy to help with coding! I can assist with:\n\n• Writing and reviewing code\n• Debugging and troubleshooting\n• Explaining programming concepts\n• Best practices and optimization\n• Multiple programming languages\n\nWhat specific coding challenge are you working on?";
    } else if (userInput.includes('write') || userInput.includes('essay') || userInput.includes('article')) {
      response = "I can definitely help with writing! I can assist with:\n\n• Essays and articles\n• Creative writing and storytelling\n• Business communications\n• Technical documentation\n• Editing and proofreading\n\nWhat type of writing project are you working on?";
    } else if (userInput.includes('explain') || userInput.includes('what is') || userInput.includes('how does')) {
      response = "I'd be happy to explain that concept! I can break down complex topics into easy-to-understand explanations, provide examples, and answer follow-up questions. What specifically would you like me to explain?";
    } else {
      // Default contextual response
      const mockResponses = [
        `I understand you're asking about "${userInput.substring(0, 50)}${userInput.length > 50 ? '...' : ''}". I'm a mock AI assistant, so while I can't provide real AI responses, I can help demonstrate the chat interface. In a real implementation, I would provide detailed, helpful responses to your questions.`,
        `That's an interesting question about "${userInput.substring(0, 30)}${userInput.length > 30 ? '...' : ''}". As a demonstration AI, I can show you how the chat system works. The real AI would analyze your question and provide comprehensive, accurate information.`,
        `I see you're interested in "${userInput.substring(0, 40)}${userInput.length > 40 ? '...' : ''}". While I'm a mock provider for testing, the actual AI system would give you detailed, helpful responses with examples and explanations tailored to your needs.`
      ];
      response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }

    const selectedResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    const usage = {
      promptTokens: this._estimateTokens(messages.map(m => m.content).join(' ') + (systemPrompt || '')),
      completionTokens: this._estimateTokens(selectedResponse),
      totalTokens: 0
    };
    usage.totalTokens = usage.promptTokens + usage.completionTokens;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      text: selectedResponse,
      usage,
      id: uuidv4(),
      model: 'mock-model-v1'
    };
  }

  _estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil((text || '').length / 4);
  }

  async testConnection() {
    return { success: true, provider: 'mock' };
  }
}

module.exports = MockProvider;