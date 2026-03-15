import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, User } from '../types';
import * as Icons from './Icons';

interface ChatWidgetProps {
  currentUser: User;
  messages: ChatMessage[];
  onSendMessage?: (content: string) => void;
  unreadCount?: number;
  isAdmin?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  currentUser,
  messages,
  onSendMessage,
  unreadCount = 0,
  isAdmin = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen ? 'bg-[#26150B] text-[#FBF7EF]' : 'bg-[#6E7568] text-[#FBF7EF] hover:bg-[#5a6155]'
        }`}
      >
        {isOpen ? (
          <Icons.XIcon size={24} />
        ) : (
          <div className="relative">
            <Icons.MessageIcon size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-[#FBF7EF] rounded-[2rem] shadow-2xl border border-[#6E7568]/20 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#6E7568] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FBF7EF]/20 flex items-center justify-center">
                <Icons.MessageIcon size={20} className="text-[#FBF7EF]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#FBF7EF]">
                  {isAdmin ? 'Client Support Chat' : 'Support Chat'}
                </h3>
                <p className="text-[10px] text-[#FBF7EF]/70">
                  {isAdmin ? 'Chat with clients' : 'Chat with our team'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#FBF7EF]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-[#6E7568]/10 flex items-center justify-center mb-4">
                    <Icons.MessageIcon size={28} className="text-[#6E7568]/50" />
                  </div>
                  <p className="text-sm font-bold text-[#26150B] mb-1">No messages yet</p>
                  <p className="text-xs text-[#6E7568]">Start a conversation with our team</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        {!isOwn && (
                          <p className="text-[9px] font-bold text-[#6E7568] mb-1 ml-1">
                            {msg.senderName}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isOwn
                              ? 'bg-[#6E7568] text-[#FBF7EF] rounded-br-md'
                              : 'bg-white text-[#26150B] border border-[#6E7568]/10 rounded-bl-md'
                          }`}
                        >
                          <p className="text-xs leading-relaxed">{msg.content}</p>
                        </div>
                        <p className={`text-[9px] text-[#6E7568]/60 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#6E7568]/10 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-[#FBF7EF] border border-[#6E7568]/10 rounded-xl text-xs text-[#26150B] outline-none focus:border-[#6E7568]/30 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-[#6E7568] text-[#FBF7EF] rounded-xl flex items-center justify-center hover:bg-[#5a6155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icons.SendIcon size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Admin Chat View - Full screen chat interface for admins (Mobile/Tablet optimized)
interface AdminChatViewProps {
  currentUser: User;
  messages: ChatMessage[];
  users: User[];
  onSendMessage: (content: string, recipientId: string) => void;
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
}

export const AdminChatView: React.FC<AdminChatViewProps> = ({
  currentUser,
  messages,
  users,
  onSendMessage,
  selectedUserId,
  onSelectUser
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false); // For mobile view toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-show chat when user is selected (for mobile)
  useEffect(() => {
    if (selectedUserId) {
      setShowChat(true);
    }
  }, [selectedUserId]);

  const handleSend = () => {
    if (newMessage.trim() && selectedUserId) {
      onSendMessage(newMessage.trim(), selectedUserId);
      setNewMessage('');
    }
  };

  const handleBack = () => {
    setShowChat(false);
    onSelectUser(null); // Clear selection
  };

  const selectedUser = useMemo(
    () => users.find(u => u.id === selectedUserId),
    [users, selectedUserId]
  );

  const conversationMessages = useMemo(
    () => messages.filter(m => m.senderId === selectedUserId || m.recipientId === selectedUserId),
    [messages, selectedUserId]
  );

  // Memoised so the function reference is stable — avoids re-renders in child
  // components that receive getUnreadCount as a prop or call it in a render map.
  const getUnreadCount = useCallback(
    (userId: string) => messages.filter(m => m.senderId === userId && !m.read).length,
    [messages]
  );

  // Pre-compute the filtered client list once per render cycle rather than
  // calling .filter() twice (once for the list, once for the empty-state check).
  const clientUsers = useMemo(
    () => users.filter(u => !u.isAdmin),
    [users]
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-200px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-[#26150B]/5 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Messages</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Chat with clients</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#6E7568]/10 shadow-sm flex-1 flex overflow-hidden relative">
        {/* Conversations List - Full width on mobile when not in chat, sidebar on desktop */}
        <div className={`absolute inset-0 md:relative md:w-80 md:border-r border-[#6E7568]/10 flex flex-col bg-white z-10 transition-transform duration-300 ${
          showChat ? 'translate-x-full md:translate-x-0' : 'translate-x-0'
        }`}>
          <div className="p-4 border-b border-[#6E7568]/10 flex-shrink-0">
            <div className="relative">
              <Icons.SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7568]/50" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-3 bg-[#FBF7EF] border border-[#6E7568]/10 rounded-xl text-sm text-[#26150B] outline-none focus:border-[#6E7568]/30"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {clientUsers.map(user => {
              const unread = getUnreadCount(user.id);
              const lastMsg = messages.filter(m => m.senderId === user.id || m.recipientId === user.id).sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0];
              
              return (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-[#FBF7EF] transition-colors border-b border-[#6E7568]/5 text-left active:bg-[#6E7568]/10 ${
                    selectedUserId === user.id ? 'bg-[#FBF7EF]' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6E7568] to-[#5a6155] flex items-center justify-center text-[#FBF7EF] font-bold text-lg shadow-md">
                      {user.name.charAt(0)}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-base font-bold text-[#26150B] truncate">{user.name}</p>
                      {lastMsg && (
                        <p className="text-[10px] text-[#6E7568]/60 flex-shrink-0 ml-2">
                          {formatTime(lastMsg.timestamp)}
                        </p>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-sm text-[#6E7568] truncate mt-1">
                        {lastMsg.senderId === currentUser.id ? 'You: ' : ''}{lastMsg.content}
                      </p>
                    )}
                  </div>
                  <Icons.ChevronRightIcon size={16} className="text-[#6E7568]/30 flex-shrink-0" />
                </button>
              );
            })}
            {clientUsers.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-[#6E7568]/10 flex items-center justify-center mx-auto mb-4">
                  <Icons.MessageIcon size={32} className="text-[#6E7568]/40" />
                </div>
                <p className="text-sm font-bold text-[#26150B] mb-1">No conversations yet</p>
                <p className="text-xs text-[#6E7568]/60">Client messages will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area - Full screen on mobile, flex-1 on desktop */}
        <div className={`absolute inset-0 md:relative flex-1 flex flex-col bg-[#FBF7EF]/50 md:bg-transparent transition-transform duration-300 ${
          showChat || selectedUserId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}>
          {selectedUserId ? (
            <>
              {/* Chat Header - Mobile optimized with back button */}
              <div className="p-4 border-b border-[#6E7568]/10 flex items-center gap-3 bg-white flex-shrink-0">
                <button 
                  onClick={handleBack}
                  className="md:hidden w-10 h-10 rounded-full bg-[#FBF7EF] flex items-center justify-center text-[#26150B] hover:bg-[#6E7568]/10 transition-colors"
                >
                  <Icons.ArrowLeftIcon size={18} />
                </button>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6E7568] to-[#5a6155] flex items-center justify-center text-[#FBF7EF] font-bold text-lg shadow-md flex-shrink-0">
                  {selectedUser?.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[#26150B] truncate">{selectedUser?.name}</p>
                  <p className="text-xs text-[#6E7568] truncate">{selectedUser?.email}</p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {conversationMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-[#6E7568]/10 flex items-center justify-center mb-4">
                      <Icons.MessageIcon size={28} className="text-[#6E7568]/50" />
                    </div>
                    <p className="text-sm font-bold text-[#26150B] mb-1">No messages yet</p>
                    <p className="text-xs text-[#6E7568]">Start the conversation</p>
                  </div>
                ) : (
                  conversationMessages.map((msg) => {
                    const isOwn = msg.senderId === currentUser.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%]`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isOwn
                                ? 'bg-[#6E7568] text-[#FBF7EF] rounded-br-md'
                                : 'bg-white text-[#26150B] border border-[#6E7568]/10 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          </div>
                          <p className={`text-[10px] text-[#6E7568]/60 mt-1 ${isOwn ? 'text-right mr-2' : 'ml-2'}`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input - Mobile optimized */}
              <div className="p-4 border-t border-[#6E7568]/10 bg-white flex-shrink-0">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3.5 bg-[#FBF7EF] border border-[#6E7568]/10 rounded-xl text-sm text-[#26150B] outline-none focus:border-[#6E7568]/30 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="w-14 h-14 md:w-auto md:px-6 md:py-3 bg-[#6E7568] text-[#FBF7EF] rounded-xl flex items-center justify-center gap-2 hover:bg-[#5a6155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg"
                  >
                    <Icons.SendIcon size={18} />
                    <span className="hidden md:inline">Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-[#6E7568]/10 flex items-center justify-center mb-6">
                <Icons.MessageIcon size={40} className="text-[#6E7568]/50" />
              </div>
              <p className="text-lg font-bold text-[#26150B] mb-2">Select a conversation</p>
              <p className="text-sm text-[#6E7568] text-center max-w-xs">Choose a client from the list to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
