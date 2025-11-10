'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit, MessageSquare } from 'lucide-react';
import MessageThread from './MessageThread';
import NewMessageDialog from './NewMessageDialog';

export default function MessagesView() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 10 seconds (increased from 5)
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      
      if (response.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      // Only set loading to false, don't keep it loading
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleConversationCreated = async (conversationId, otherUserId) => {
    setShowNewMessage(false);
    
    // Fetch conversations again to get the new one with all details
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      
      if (response.ok) {
        const updatedConversations = data.conversations || [];
        setConversations(updatedConversations);
        
        // Find and select the new conversation
        const newConv = updatedConversations.find(c => c.id === conversationId);
        if (newConv) {
          setSelectedConversation(newConv);
        }
      }
    } catch (error) {
      console.error('Error fetching updated conversations:', error);
      // Fallback: just fetch conversations
      fetchConversations();
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (conv.otherParticipant?.display_name || conv.otherParticipant?.username || '').toLowerCase();
    return name.includes(query);
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] glass">
      {/* Conversations List Sidebar */}
      <div className="w-full md:w-96 border-r border-white/10 flex flex-col glass">
        {/* Header */}
        <div className="p-4 border-b border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold gradient-text">Messages</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewMessage(true)}
              className="glass-hover neon-glow hover:border-purple-500/50"
            >
              <Edit className="h-5 w-5 text-purple-400" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 glass border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-purple-500/50" />
              <p className="text-gray-400 mb-2">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewMessage(true)}
                className="glass-hover border-purple-500/30 text-purple-400 hover:text-purple-300"
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 flex items-center gap-3 glass-hover transition-all text-left relative ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-500/10 border-l-2 border-blue-500'
                      : ''
                  }`}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-purple-500/30 neon-glow">
                    <AvatarImage src={conversation.otherParticipant?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                      {conversation.otherParticipant?.display_name?.[0] ||
                        conversation.otherParticipant?.username?.[0] ||
                        '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold text-sm truncate ${
                        conversation.unreadCount > 0 ? 'text-white' : 'text-gray-300'
                      }`}>
                        {conversation.otherParticipant?.display_name ||
                          conversation.otherParticipant?.username}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {conversation.latestMessage
                          ? formatMessageTime(conversation.latestMessage.created_at)
                          : ''}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${
                        conversation.unreadCount > 0
                          ? 'text-white font-medium'
                          : 'text-gray-400'
                      }`}>
                        {conversation.latestMessage?.content || 'Start a conversation'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="ml-2 flex-shrink-0 bg-blue-500/20 text-blue-400 border border-blue-500/30 neon-glow animate-pulse">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            onBack={() => setSelectedConversation(null)}
            onMessageSent={fetchConversations}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg mb-2">Select a message</p>
              <p className="text-sm">Choose a conversation from the list</p>
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <NewMessageDialog
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
