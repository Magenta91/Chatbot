import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionType, setConnectionType] = useState('http'); // 'http', 'sse', or 'websocket'
  const [error, setError] = useState(null);
  
  const eventSourceRef = useRef(null);
  const wsRef = useRef(null);

  // Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // Cleanup connections on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadSessions = async () => {
    try {
      const response = await axios.get('/chat/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError('Failed to load chat sessions');
    }
  };

  const createSession = async (options = {}) => {
    try {
      const sessionData = {
        provider: options.provider || user.preferences.defaultProvider,
        model: options.model || user.preferences.defaultModel,
        temperature: options.temperature || user.preferences.defaultTemperature,
        systemPrompt: options.systemPrompt || user.preferences.systemPrompt,
        maxTokens: options.maxTokens || 1000
      };

      const response = await axios.post('/chat/session', sessionData);
      const newSession = response.data;

      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create new session');
      throw error;
    }
  };

  const loadSession = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/chat/sessions/${sessionId}/messages`);
      
      setCurrentSession(response.data.session);
      setMessages(response.data.messages);
      
      // Update current session in sessions list
      setSessions(prev => prev.map(s => 
        s.sessionId === sessionId ? response.data.session : s
      ));
    } catch (error) {
      console.error('Failed to load session:', error);
      setError('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content, options = {}) => {
    if (!currentSession || isStreaming) return;

    try {
      setIsStreaming(true);
      setError(null);

      // Add user message immediately
      const userMessage = {
        _id: Date.now().toString(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        metadata: {}
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Create assistant message placeholder
      const assistantMessage = {
        _id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        metadata: { isStreaming: true },
        status: 'streaming'
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Use HTTP by default, can switch to streaming later
      if (connectionType === 'http') {
        await sendMessageHTTP(content, assistantMessage._id, options);
      } else if (connectionType === 'sse') {
        await sendMessageSSE(content, assistantMessage._id, options);
      } else {
        await sendMessageWebSocket(content, assistantMessage._id, options);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      
      // Remove the assistant message placeholder on error
      setMessages(prev => prev.filter(m => m.status !== 'streaming'));
    }
  };

  const sendMessageSSE = async (content, messageId, options) => {
    try {
      // First, initiate the streaming request
      const streamUrl = `${axios.defaults.baseURL}/chat/stream`;
      
      // Send the message to start streaming
      await axios.post('/chat/message', {
        sessionId: currentSession.sessionId,
        message: content,
        provider: options.provider
      });

      // Now connect to the stream
      const eventSource = new EventSource(
        `${streamUrl}?sessionId=${currentSession.sessionId}`
      );

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'token') {
            // Update the streaming message
            setMessages(prev => prev.map(msg => 
              msg._id === messageId 
                ? { ...msg, content: msg.content + data.content }
                : msg
            ));
          } else if (data.type === 'done') {
            // Mark streaming as complete
            setMessages(prev => prev.map(msg => 
              msg._id === messageId 
                ? { 
                    ...msg, 
                    _id: data.messageId || msg._id,
                    status: 'completed',
                    metadata: { 
                      ...msg.metadata, 
                      isStreaming: false,
                      usage: data.usage,
                      responseTime: data.responseTime
                    }
                  }
                : msg
            ));
            setIsStreaming(false);
            eventSource.close();
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        
        // Fallback to WebSocket
        if (connectionType === 'sse') {
          setConnectionType('websocket');
          sendMessageWebSocket(content, messageId, options);
        } else {
          setError('Connection failed');
          setIsStreaming(false);
        }
      };

    } catch (error) {
      // Fallback to direct HTTP request
      await sendMessageHTTP(content, messageId, options);
    }
  };

  const sendMessageWebSocket = async (content, messageId, options) => {
    return new Promise((resolve, reject) => {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:4000/ws/chat';
      const ws = new WebSocket(wsUrl);
      
      wsRef.current = ws;

      ws.onopen = () => {
        // Authenticate
        const token = localStorage.getItem('token');
        ws.send(JSON.stringify({
          type: 'auth',
          token
        }));
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket received:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.type === 'auth_success') {
            // Send chat message
            ws.send(JSON.stringify({
              type: 'chat',
              sessionId: currentSession.sessionId,
              message: content,
              provider: options.provider
            }));
          } else if (data.type === 'token') {
            // Update streaming message
            setMessages(prev => prev.map(msg => 
              msg._id === messageId 
                ? { ...msg, content: msg.content + data.content }
                : msg
            ));
          } else if (data.type === 'done') {
            // Complete streaming
            setMessages(prev => prev.map(msg => 
              msg._id === messageId 
                ? { 
                    ...msg, 
                    _id: data.messageId || msg._id,
                    status: 'completed',
                    metadata: { 
                      ...msg.metadata, 
                      isStreaming: false,
                      usage: data.usage,
                      responseTime: data.responseTime
                    }
                  }
                : msg
            ));
            setIsStreaming(false);
            ws.close();
            resolve();
          } else if (data.type === 'error') {
            console.error('WebSocket error message:', data.message);
            setError(data.message);
            setIsStreaming(false);
            ws.close();
            reject(new Error(data.message));
          } else {
            console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
          console.error('Raw message data:', event.data);
          setError('Failed to process message');
          setIsStreaming(false);
          ws.close();
          reject(error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
        
        // Fallback to HTTP
        sendMessageHTTP(content, messageId, options)
          .then(resolve)
          .catch(reject);
      };

      ws.onclose = () => {
        if (isStreaming) {
          setIsStreaming(false);
        }
      };
    });
  };

  const sendMessageHTTP = async (content, messageId, options) => {
    try {
      // Call the new simple HTTP endpoint
      const response = await axios.post('/chat/message/simple', {
        sessionId: currentSession.sessionId,
        message: content,
        provider: options.provider
      });

      if (response.data.success) {
        // Update the assistant message with the real response
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { 
                ...msg, 
                _id: response.data.assistantMessage.id,
                content: response.data.assistantMessage.content,
                status: 'completed',
                createdAt: response.data.assistantMessage.createdAt,
                metadata: { 
                  ...msg.metadata, 
                  isStreaming: false,
                  ...response.data.assistantMessage.metadata
                }
              }
            : msg
        ));
      } else {
        throw new Error('Failed to get response from server');
      }
      
      setIsStreaming(false);
    } catch (error) {
      console.error('HTTP message error:', error);
      
      // Show error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get response';
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { 
              ...msg, 
              content: `Error: ${errorMessage}`,
              status: 'error',
              metadata: { ...msg.metadata, isStreaming: false }
            }
          : msg
      ));
      setIsStreaming(false);
      setError(errorMessage);
    }
  };

  const clearContext = async () => {
    if (!currentSession) return;

    try {
      await axios.delete(`/chat/sessions/${currentSession.sessionId}/context`);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear context:', error);
      setError('Failed to clear context');
    }
  };

  const summarizeContext = async () => {
    if (!currentSession) return;

    try {
      setIsLoading(true);
      await axios.post(`/chat/sessions/${currentSession.sessionId}/summarize`);
      
      // Reload messages to see the summarized version
      await loadSession(currentSession.sessionId);
    } catch (error) {
      console.error('Failed to summarize context:', error);
      setError('Failed to summarize context');
    } finally {
      setIsLoading(false);
    }
  };

  const exportConversation = async (format = 'json') => {
    if (!currentSession) return;

    try {
      const response = await axios.get(
        `/chat/sessions/${currentSession.sessionId}/export?format=${format}`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat-${currentSession.sessionId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
      setError('Failed to export conversation');
    }
  };

  const retryMessage = async (messageId) => {
    const message = messages.find(m => m._id === messageId);
    if (!message || message.role !== 'user') return;

    // Remove failed assistant response if exists
    const messageIndex = messages.findIndex(m => m._id === messageId);
    if (messageIndex < messages.length - 1) {
      setMessages(prev => prev.slice(0, messageIndex + 1));
    }

    // Resend the message
    await sendMessage(message.content);
  };

  const value = {
    sessions,
    currentSession,
    messages,
    isLoading,
    isStreaming,
    connectionType,
    error,
    createSession,
    loadSession,
    sendMessage,
    clearContext,
    summarizeContext,
    exportConversation,
    retryMessage,
    setError,
    setConnectionType
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};