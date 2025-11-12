import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Mic, MicOff } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

const MessageInput = ({ disabled, sessionSettings }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const { sendMessage, isStreaming } = useChat();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isStreaming) {
      return;
    }

    const messageToSend = message.trim();
    setMessage('');
    
    try {
      await sendMessage(messageToSend, {
        provider: sessionSettings.provider
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setMessage(messageToSend);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStop = () => {
    // TODO: Implement stop functionality
    console.log('Stop streaming requested');
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // TODO: Implement speech-to-text
    } else {
      // Start recording
      setIsRecording(true);
      // TODO: Implement speech-to-text
    }
  };

  const handleFileUpload = () => {
    // TODO: Implement file upload
    console.log('File upload requested');
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={handleFileUpload}
            disabled={disabled}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled 
                  ? 'Please wait...' 
                  : 'Type your message... (Press Enter to send, Shift+Enter for new line)'
              }
              disabled={disabled}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            
            {/* Character count */}
            {message.length > 0 && (
              <div className="absolute bottom-1 right-1 text-xs text-gray-400">
                {message.length}
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <button
            type="button"
            onClick={handleVoiceRecording}
            disabled={disabled}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              isRecording 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-400 hover:text-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          {/* Send/Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex-shrink-0 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              title="Stop generation"
            >
              <Square className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="flex-shrink-0 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </form>

        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setMessage('Explain this concept in simple terms: ')}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Explain
          </button>
          <button
            onClick={() => setMessage('Help me write a ')}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Write
          </button>
          <button
            onClick={() => setMessage('Review this code: \n```\n\n```')}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Code Review
          </button>
          <button
            onClick={() => setMessage('Brainstorm ideas for ')}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Brainstorm
          </button>
        </div>

        {/* Status Bar */}
        {sessionSettings && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span>Provider:</span>
                <span className="font-medium text-gray-700">{sessionSettings.provider}</span>
                {sessionSettings.provider === 'openai' && (
                  <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">Free</span>
                )}
              </span>
              <span>Model: <span className="font-medium">{sessionSettings.model}</span></span>
              <span>Temp: <span className="font-medium">{sessionSettings.temperature}</span></span>
            </div>
            
            {isStreaming && (
              <div className="flex items-center space-x-1 text-blue-600">
                <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;