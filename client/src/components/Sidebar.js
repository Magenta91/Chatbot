import React, { useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Search, 
  Calendar,
  Clock,
  Trash2,
  MoreVertical
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { 
    sessions, 
    currentSession, 
    createSession, 
    loadSession 
  } = useChat();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  const filteredSessions = sessions.filter(session =>
    (session.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSessionClick = async (session) => {
    if (session.sessionId !== currentSession?.sessionId) {
      await loadSession(session.sessionId);
    }
    onClose();
  };

  const handleNewSession = async () => {
    await createSession();
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const groupSessionsByDate = (sessions) => {
    const groups = {};
    sessions.forEach(session => {
      const date = formatDate(session.lastActivityAt || session.createdAt);
      if (!groups[date]) groups[date] = [];
      groups[date].push(session);
    });
    return groups;
  };

  const sessionGroups = groupSessionsByDate(filteredSessions);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Chat Sessions</h2>
              <p className="text-xs text-gray-500">Welcome, {user?.username}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Session Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {Object.keys(sessionGroups).length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            Object.entries(sessionGroups).map(([date, sessions]) => (
              <div key={date} className="mb-4">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{date}</span>
                  </div>
                </div>
                
                <div className="space-y-1 p-2">
                  {sessions.map((session) => (
                    <SessionItem
                      key={session.sessionId}
                      session={session}
                      isActive={session.sessionId === currentSession?.sessionId}
                      onClick={() => handleSessionClick(session)}
                      onSelect={setSelectedSession}
                      isSelected={selectedSession?.sessionId === session.sessionId}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Total Sessions:</span>
              <span className="font-medium">{sessions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Session:</span>
              <span className="font-medium">
                {currentSession ? currentSession.provider : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SessionItem = ({ session, isActive, onClick, onSelect, isSelected }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
    onSelect(session);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getProviderColor = (provider) => {
    const colors = {
      openai: 'bg-green-100 text-green-800',
      dialogflow: 'bg-blue-100 text-blue-800',
      mock: 'bg-gray-100 text-gray-800'
    };
    return colors[provider] || colors.mock;
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`
          w-full text-left p-3 rounded-lg transition-colors group
          ${isActive 
            ? 'bg-blue-50 border-2 border-blue-200' 
            : 'hover:bg-gray-50 border-2 border-transparent'
          }
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {session.title}
              </h3>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getProviderColor(session.provider)}`}>
                {session.provider}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatDate(session.lastActivityAt || session.createdAt)}</span>
              {session.context?.messageCount > 0 && (
                <>
                  <span>•</span>
                  <span>{session.context.messageCount} messages</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleMenuClick}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </button>

      {/* Context Menu */}
      {showMenu && isSelected && (
        <div className="absolute right-2 top-12 z-10 w-48 bg-white rounded-md shadow-lg border border-gray-200">
          <div className="py-1">
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
              <Trash2 className="h-4 w-4" />
              <span>Delete Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;