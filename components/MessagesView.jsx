'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Edit, MessageSquare, Users, Plus } from 'lucide-react';
import MessageThread from './MessageThread';
import GroupChatThread from './GroupChatThread';
import NewMessageDialog from './NewMessageDialog';
import NewGroupDialog from './NewGroupDialog';

export default function MessagesView({ onViewProfile }) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' or 'groups'

  useEffect(() => {
    fetchConversations();
    fetchGroups();
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      fetchConversations();
      fetchGroups();
    }, 10000);
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

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      
      if (response.ok) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
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
          setSelectedGroup(null);
        }
      }
    } catch (error) {
      console.error('Error fetching updated conversations:', error);
      // Fallback: just fetch conversations
      fetchConversations();
    }
  };

  const handleGroupCreated = async (groupId) => {
    setShowNewGroup(false);
    
    // Fetch groups again to get the new one with all details
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      
      if (response.ok) {
        const updatedGroups = data.groups || [];
        setGroups(updatedGroups);
        
        // Find and select the new group
        const newGroup = updatedGroups.find(g => g.id === groupId);
        if (newGroup) {
          setSelectedGroup(newGroup);
          setSelectedConversation(null);
          setActiveTab('groups');
        }
      }
    } catch (error) {
      console.error('Error fetching updated groups:', error);
      fetchGroups();
    }
  };

  const handleConversationDeleted = () => {
    // Close the thread view
    setSelectedConversation(null);
    // Refresh the conversation list
    fetchConversations();
  };

  const handleGroupDeleted = () => {
    // Close the thread view
    setSelectedGroup(null);
    // Refresh the groups list
    fetchGroups();
  };

  const handleGroupLeft = () => {
    setSelectedGroup(null);
    fetchGroups();
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

  const filteredGroups = groups.filter(group => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (group.group_name || '').toLowerCase();
    return name.includes(query);
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  const totalGroupUnread = groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);

  return (
    <div className="fixed inset-0 top-16 flex glass">
      {/* Conversations List Sidebar */}
      <div className="w-full md:w-96 border-r border-white/10 flex flex-col glass">
        {/* Header */}
        <div className="p-4 border-b border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold gradient-text">Messages</h2>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewGroup(true)}
                className="glass-hover neon-glow hover:border-green-500/50"
                title="Create Group"
              >
                <Users className="h-5 w-5 text-green-400" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewMessage(true)}
                className="glass-hover neon-glow hover:border-purple-500/50"
                title="New Message"
              >
                <Edit className="h-5 w-5 text-purple-400" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full glass">
              <TabsTrigger value="messages" className="flex-1 data-[state=active]:bg-blue-500/20">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
                {totalUnread > 0 && (
                  <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 data-[state=active]:bg-green-500/20">
                <Users className="h-4 w-4 mr-2" />
                Groups
                {totalGroupUnread > 0 && (
                  <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                    {totalGroupUnread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={activeTab === 'messages' ? "Search messages..." : "Search groups..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 glass border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Conversations/Groups List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'messages' ? (
            // Direct Messages List
            filteredConversations.length === 0 ? (
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
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setSelectedGroup(null);
                    }}
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
            )
          ) : (
            // Groups List
            filteredGroups.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                <p className="text-gray-400 mb-2">
                  {searchQuery ? 'No groups found' : 'No groups yet'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewGroup(true)}
                  className="glass-hover border-green-500/30 text-green-400 hover:text-green-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create a group
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedConversation(null);
                    }}
                    className={`w-full p-4 flex items-center gap-3 glass-hover transition-all text-left relative ${
                      selectedGroup?.id === group.id
                        ? 'bg-green-500/10 border-l-2 border-green-500'
                        : ''
                    }`}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-green-500/30 neon-glow">
                      <AvatarImage src={group.group_avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 via-teal-500 to-cyan-500 text-white font-semibold">
                        {group.group_name?.[0] || 'G'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm truncate ${
                            group.unreadCount > 0 ? 'text-white' : 'text-gray-300'
                          }`}>
                            {group.group_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {group.memberCount} members
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {group.latestMessage
                            ? formatMessageTime(group.latestMessage.created_at)
                            : ''}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${
                          group.unreadCount > 0
                            ? 'text-white font-medium'
                            : 'text-gray-400'
                        }`}>
                          {group.latestMessage?.encrypted_content 
                            ? '💬 New message' 
                            : 'No messages yet'}
                        </p>
                        {group.unreadCount > 0 && (
                          <Badge className="ml-2 flex-shrink-0 bg-green-500/20 text-green-400 border border-green-500/30 neon-glow animate-pulse">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
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
            onConversationDeleted={handleConversationDeleted}
            onViewProfile={onViewProfile}
          />
        ) : selectedGroup ? (
          <GroupChatThread
            group={selectedGroup}
            onBack={() => setSelectedGroup(null)}
            onMessageSent={fetchGroups}
            onGroupDeleted={handleGroupDeleted}
            onGroupLeft={handleGroupLeft}
            onViewProfile={onViewProfile}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg mb-2">Select a message</p>
              <p className="text-sm">Choose a conversation or group from the list</p>
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

      {/* New Group Dialog */}
      <NewGroupDialog
        isOpen={showNewGroup}
        onClose={() => setShowNewGroup(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}
