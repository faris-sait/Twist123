'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function MessageThread({ conversation, onBack, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserProfileId, setCurrentUserProfileId] = useState(null);
  const scrollRef = useRef(null);
  const { user } = useUser();

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      // Poll for new messages every 3 seconds (increased from 2)
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      if (response.ok && data.profile) {
        setCurrentUserProfileId(data.profile.id);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      // Only set loading false on first load
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([...messages, data.message]);
        if (onMessageSent) onMessageSent();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (date.toDateString() === today) return 'Today';
    if (date.toDateString() === yesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full glass">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden glass-hover"
        >
          <ArrowLeft className="h-5 w-5 text-purple-400" />
        </Button>
        
        <Avatar className="h-10 w-10 ring-2 ring-purple-500/30 neon-glow">
          <AvatarImage src={conversation.otherParticipant?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
            {conversation.otherParticipant?.display_name?.[0] ||
              conversation.otherParticipant?.username?.[0] ||
              '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">
              {conversation.otherParticipant?.display_name ||
                conversation.otherParticipant?.username}
            </h3>
            {conversation.otherParticipant?.is_verified && (
              <Badge variant="secondary" className="h-4 text-xs px-1 bg-blue-500/20 text-blue-400 border-blue-500/30">✓</Badge>
            )}
          </div>
          <p className="text-xs text-gray-400">
            @{conversation.otherParticipant?.username}
          </p>
        </div>
        
        <Button variant="ghost" size="icon" className="glass-hover">
          <MoreVertical className="h-5 w-5 text-gray-400" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">No messages yet</p>
            <p className="text-sm text-gray-500">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="glass px-3 py-1 rounded-full border border-white/10">
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDateLabel(date)}
                    </span>
                  </div>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-3">
                  {msgs.map((message, index) => {
                    const isOwn = message.sender_id === currentUserProfileId;
                    const showAvatar = !isOwn && (
                      index === msgs.length - 1 ||
                      msgs[index + 1]?.sender_id !== message.sender_id
                    );

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        {showAvatar ? (
                          <Avatar className="h-6 w-6 flex-shrink-0 ring-1 ring-purple-500/30">
                            <AvatarImage src={conversation.otherParticipant?.avatar_url} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white">
                              {conversation.otherParticipant?.display_name?.[0] ||
                                conversation.otherParticipant?.username?.[0] ||
                                '?'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-6 flex-shrink-0" />
                        )}
                        
                        <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 backdrop-blur-xl ${
                              isOwn
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white neon-glow'
                                : 'glass border border-white/10 text-white'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 mt-1 px-2">
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-white/10 backdrop-blur-xl">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 glass border-white/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-gray-400"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
