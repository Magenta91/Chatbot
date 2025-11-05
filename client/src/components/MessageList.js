import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, User, Bot, Clock, CheckCircle, AlertCircle, RotateCcw, ArrowDown, ArrowUp } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

const MessageList = ({ messages, isLoading, isStreaming }) => {
  const { retryMessage } = useChat();
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastReadMessageRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive (if auto-scroll is enabled)
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      lastReadMessageRef.current = messages.length;
      setUnreadCount(0);
    } else {
      // Calculate unread messages
      const newUnread = Math.max(0, messages.length - lastReadMessageRef.current);
      setUnreadCount(newUnread);
    }
  }, [messages, autoScroll]);

  // Keyboard shortcuts for scrolling
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle if the messages container is focused or no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'Home':
          event.preventDefault();
          scrollToTop();
          break;
        case 'End':
          event.preventDefault();
          scrollToBottom();
          break;
        case 'PageUp':
          event.preventDefault();
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollBy({ top: -300, behavior: 'smooth' });
          }
          break;
        case 'PageDown':
          event.preventDefault();
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollBy({ top: 300, behavior: 'smooth' });
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if user has scrolled up to show/hide scroll button
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // Debug: Log scroll dimensions (remove in production)
      console.log('Scroll Debug:', { scrollTop, scrollHeight, clientHeight, canScroll: scrollHeight > clientHeight });
      
      // Calculate scroll progress
      const progress = scrollHeight > clientHeight 
        ? (scrollTop / (scrollHeight - clientHeight)) * 100 
        : 0;
      
      setScrollProgress(Math.min(progress, 100));
      setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
      setAutoScroll(isNearBottom);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
      lastReadMessageRef.current = messages.length;
      setUnreadCount(0);
    }
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      setAutoScroll(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 text-gray-500">
      <div className="typing-indicator">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
      <span className="text-sm">AI is typing...</span>
    </div>
  );

  const MessageContent = ({ content, role }) => {
    if (role === 'user') {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language) {
              return (
                <div className="code-block relative">
                  <button
                    onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                    className="copy-button absolute top-2 right-2 p-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                    title="Copy code"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={language}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
                {children}
              </blockquote>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const MessageBubble = ({ message, index }) => {
    const isUser = message.role === 'user';
    const isStreaming = message.metadata?.isStreaming;
    const isError = message.status === 'error';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`message-bubble p-4 ${isUser ? 'user-message' : 'assistant-message'} ${isError ? 'border-red-300 bg-red-50' : ''}`}>
          {/* Message Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {isUser ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              {message.metadata?.provider && (
                <span className="text-xs opacity-75">
                  ({message.metadata.provider})
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {message.createdAt && (
                <span className="text-xs opacity-75 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimestamp(message.createdAt)}
                </span>
              )}
              
              {/* Status indicators */}
              {isStreaming && (
                <div className="animate-pulse">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
              
              {message.status === 'completed' && !isUser && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
              
              {isError && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className="text-sm">
            {isStreaming && !message.content ? (
              <TypingIndicator />
            ) : (
              <MessageContent content={message.content} role={message.role} />
            )}
          </div>

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 border-opacity-50">
            <div className="flex items-center space-x-2 text-xs opacity-75">
              {message.metadata?.usage && (
                <span>
                  {message.metadata.usage.totalTokens} tokens
                </span>
              )}
              
              {message.metadata?.responseTime && (
                <span>
                  {message.metadata.responseTime}ms
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {!isUser && (
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className="p-1 rounded hover:bg-gray-200 hover:bg-opacity-50"
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
              
              {isError && isUser && (
                <button
                  onClick={() => retryMessage(message._id)}
                  className="p-1 rounded hover:bg-gray-200 hover:bg-opacity-50"
                  title="Retry message"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start a conversation
          </h3>
          <p className="text-gray-500 mb-4">
            Ask me anything! I can help with questions, writing, coding, analysis, and more.
          </p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="bg-gray-50 rounded-lg p-3 text-left">
              <div className="font-medium text-gray-700">Example prompts:</div>
              <ul className="mt-1 space-y-1 text-gray-600">
                <li>• "Explain quantum computing in simple terms"</li>
                <li>• "Help me write a professional email"</li>
                <li>• "Review this code for bugs"</li>
                <li>• "Brainstorm ideas for a mobile app"</li>
              </ul>
            </div>
          </div>
          
          {/* Scroll Test (Development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4">
              <button 
                onClick={() => {
                  // Add test messages to check scrolling
                  console.log('Adding test messages for scroll testing');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
              >
                Test Scrolling (Dev)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 min-h-0"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto space-y-4" style={{ minHeight: '100%' }}>
          {messages.map((message, index) => (
            <MessageBubble 
              key={message._id || index} 
              message={message} 
              index={index}
            />
          ))}
          
          {isStreaming && (
            <div className="flex justify-start mb-4">
              <div className="message-bubble assistant-message p-4">
                <TypingIndicator />
              </div>
            </div>
          )}
          
          {/* Add some padding at the bottom for better UX */}
          <div className="h-20" />
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      {messages.length > 3 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-10">
          <div 
            className="h-full bg-blue-500 transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black text-white text-xs p-2 rounded opacity-50">
          Messages: {messages.length} | Progress: {Math.round(scrollProgress)}%
        </div>
      )}

      {/* Scroll Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        {/* Force Scroll Test Button (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollBy({ top: 100, behavior: 'smooth' });
              }
            }}
            className="scroll-button p-2 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all duration-200"
            title="Test Scroll"
          >
            ↕
          </button>
        )}

        {/* Scroll to Top Button */}
        {messages.length > 2 && (
          <button
            onClick={scrollToTop}
            className="scroll-button p-2 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-200"
            title="Scroll to top"
          >
            <ArrowUp className="h-4 w-4 text-gray-600" />
          </button>
        )}

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="scroll-button relative p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200"
            title={`Scroll to bottom${unreadCount > 0 ? ` • ${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : ''}`}
          >
            <ArrowDown className="h-4 w-4" />
            {/* Unread message count */}
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Auto-scroll Indicator */}
      {!autoScroll && messages.length > 0 && (
        <div className="absolute top-6 right-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-1 text-xs text-yellow-800 flex items-center space-x-2">
          <span>Auto-scroll disabled</span>
          <span className="text-yellow-600">({Math.round(scrollProgress)}%)</span>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {messages.length > 5 && (
        <div className="absolute bottom-4 left-4 bg-gray-800 text-white rounded-lg px-3 py-2 text-xs opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="font-medium mb-1">Keyboard shortcuts:</div>
          <div>Home - Top • End - Bottom</div>
          <div>PgUp/PgDn - Scroll</div>
        </div>
      )}
    </div>
  );
};

export default MessageList;