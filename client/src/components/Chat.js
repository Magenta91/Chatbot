import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SettingsPanel from './SettingsPanel';
import { 
  Menu, 
  Settings, 
  LogOut, 
  Plus,
  Trash2,
  Download,
  Zap,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const { 
    currentSession, 
    messages, 
    isLoading, 
    isStreaming, 
    connectionType,
    error,
    createSession,
    clearContext,
    summarizeContext,
    exportConversation,
    setError,
    setConnectionType
  } = useChat();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionSettings, setSessionSettings] = useState({
    provider: user?.preferences?.defaultProvider || 'openai',
    model: user?.preferences?.defaultModel || 'gpt-4o-mini',
    temperature: user?.preferences?.defaultTemperature || 0.7,
    systemPrompt: user?.preferences?.systemPrompt || ''
  });

  // Scroll handling is now done in MessageList component

  const handleNewSession = useCallback(async () => {
    try {
      await createSession(sessionSettings);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, [createSession, sessionSettings]);

  // Create initial session if none exists
  useEffect(() => {
    if (!currentSession && !isLoading) {
      handleNewSession();
    }
  }, [currentSession, isLoading, handleNewSession]);

  const handleClearContext = async () => {
    if (window.confirm('Are you sure you want to clear the conversation context? This cannot be undone.')) {
      await clearContext();
    }
  };

  const handleSummarizeContext = async () => {
    if (window.confirm('Summarize the conversation to reduce token usage? This will replace older messages with a summary.')) {
      await summarizeContext();
    }
  };

  const handleExport = async (format) => {
    await exportConversation(format);
  };

  const toggleConnectionType = () => {
    const types = ['http', 'sse', 'websocket'];
    const currentIndex = types.indexOf(connectionType);
    const nextIndex = (currentIndex + 1) % types.length;
    setConnectionType(types[nextIndex]);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentSession?.title || 'AI Chat'}
                </h1>
                {currentSession && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {currentSession.provider}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleConnectionType}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 relative"
                  title={`Connection: ${connectionType.toUpperCase()}`}
                >
                  {connectionType === 'http' ? (
                    <WifiOff className="h-4 w-4" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  {/* Connection status indicator */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </button>
                <span className="text-xs text-gray-500">{connectionType.toUpperCase()}</span>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleNewSession}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="New Session"
              >
                <Plus className="h-5 w-5" />
              </button>

              <button
                onClick={handleClearContext}
                disabled={!currentSession || messages.length === 0}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear Context"
              >
                <Trash2 className="h-5 w-5" />
              </button>

              <button
                onClick={handleSummarizeContext}
                disabled={!currentSession || messages.length < 4}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Summarize Context"
              >
                <Zap className="h-5 w-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => handleExport('json')}
                  disabled={!currentSession || messages.length === 0}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export Conversation"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList 
            messages={messages}
            isLoading={isLoading}
            isStreaming={isStreaming}
          />
        </div>

        {/* Message Input */}
        <MessageInput 
          disabled={isStreaming}
          sessionSettings={sessionSettings}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sessionSettings={sessionSettings}
        onSessionSettingsChange={setSessionSettings}
      />
    </div>
  );
};

export default Chat;