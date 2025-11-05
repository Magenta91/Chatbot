import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Save, RefreshCw, Info } from 'lucide-react';

const SettingsPanel = ({ isOpen, onClose, sessionSettings, onSessionSettingsChange }) => {
  const { user, updatePreferences } = useAuth();
  const [localSettings, setLocalSettings] = useState(sessionSettings);
  const [userPreferences, setUserPreferences] = useState(user?.preferences || {});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('session');

  useEffect(() => {
    setLocalSettings(sessionSettings);
  }, [sessionSettings]);

  useEffect(() => {
    setUserPreferences(user?.preferences || {});
  }, [user]);

  const handleSessionSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSessionSettingsChange(newSettings);
  };

  const handlePreferenceChange = (key, value) => {
    setUserPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(userPreferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      systemPrompt: 'You are a helpful AI assistant.'
    };
    
    if (activeTab === 'session') {
      setLocalSettings(defaults);
      onSessionSettingsChange(defaults);
    } else {
      setUserPreferences(defaults);
    }
  };

  const providerOptions = [
    { value: 'openai', label: 'OpenAI', description: 'GPT models from OpenAI' },
    { value: 'dialogflow', label: 'Dialogflow', description: 'Google Dialogflow ES' },
    { value: 'mock', label: 'Mock Provider', description: 'For testing and development' }
  ];

  const modelOptions = {
    openai: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Free)', description: 'Fast, efficient, and free tier compatible' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Free)', description: 'Reliable and free tier compatible' }
    ],
    dialogflow: [
      { value: 'dialogflow-es', label: 'Dialogflow ES', description: 'Standard Dialogflow model' }
    ],
    mock: [
      { value: 'mock-model-v1', label: 'Mock Model v1', description: 'Simulated responses' }
    ]
  };

  const currentSettings = activeTab === 'session' ? localSettings : userPreferences;
  const handleChange = activeTab === 'session' ? handleSessionSettingChange : handlePreferenceChange;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('session')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'session'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Current Session
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preferences'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Default Preferences
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <select
                value={currentSettings.provider || 'openai'}
                onChange={(e) => handleChange('provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {providerOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {providerOptions.find(p => p.value === currentSettings.provider)?.description}
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={currentSettings.model || 'gpt-4o-mini'}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {(modelOptions[currentSettings.provider] || modelOptions.openai).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {(modelOptions[currentSettings.provider] || modelOptions.openai)
                  .find(m => m.value === currentSettings.model)?.description}
              </p>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {currentSettings.temperature || 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={currentSettings.temperature || 0.7}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More focused (0)</span>
                <span>Balanced (1)</span>
                <span>More creative (2)</span>
              </div>
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Temperature controls randomness. Lower values make responses more focused and deterministic, 
                    while higher values make them more creative and varied.
                  </p>
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={currentSettings.systemPrompt || ''}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                placeholder="Enter instructions for the AI assistant..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-sm text-gray-500">
                System prompts help define the AI's behavior and personality. Leave empty for default behavior.
              </p>
            </div>

            {/* Max Tokens (Session only) */}
            {activeTab === 'session' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens: {currentSettings.maxTokens || 1000}
                </label>
                <input
                  type="range"
                  min="100"
                  max="4000"
                  step="100"
                  value={currentSettings.maxTokens || 1000}
                  onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Short (100)</span>
                  <span>Medium (2000)</span>
                  <span>Long (4000)</span>
                </div>
              </div>
            )}

            {/* Usage Information (Preferences only) */}
            {activeTab === 'preferences' && user && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Requests:</span>
                    <span className="ml-2 font-medium">{user.usage?.totalRequests || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Tokens:</span>
                    <span className="ml-2 font-medium">{user.usage?.totalTokens || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Daily Limit:</span>
                    <span className="ml-2 font-medium">{user.quotas?.dailyRequestLimit || 100}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Token Limit:</span>
                    <span className="ml-2 font-medium">{user.quotas?.dailyTokenLimit || 10000}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetToDefaults}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            
            {activeTab === 'preferences' && (
              <button
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;