'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Send, 
  MoreVertical, 
  Trash2, 
  Check, 
  CheckCheck,
  Image as ImageIcon,
  Smile,
  X
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function MessageThread({ conversation, onBack, onMessageSent, onConversationDeleted, onViewProfile }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserProfileId, setCurrentUserProfileId] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useUser();
  const shouldAutoScrollRef = useRef(true); // Only scroll on initial load
  const fileInputRef = useRef(null);

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
    // Only auto-scroll on initial load
    if (shouldAutoScrollRef.current && messages.length > 0) {
      scrollToBottom();
      shouldAutoScrollRef.current = false;
    }
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
    if ((!newMessage.trim() && !selectedImage) || isSending) return;

    const messageContent = newMessage.trim();
    let imageUrl = null;

    setIsSending(true);

    try {
      // Convert image to base64 if selected
      if (selectedImage) {
        setIsUploadingImage(true);
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
        setIsUploadingImage(false);
      }

      // Send message with or without image
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: messageContent || '📷 Image',
          image_url: imageUrl 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([...messages, data.message]);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        if (onMessageSent) onMessageSent();
        // Scroll to bottom after sending a message
        setTimeout(() => scrollToBottom(), 100);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setIsUploadingImage(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages(messages.filter(msg => msg.id !== messageId));
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!confirm('Are you sure you want to delete this entire conversation? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Call the callback to refresh conversation list and go back
        if (onConversationDeleted) {
          onConversationDeleted();
        } else {
          // Fallback: just go back
          onBack();
        }
      } else {
        console.error('Failed to delete conversation');
        alert('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Error deleting conversation');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        
        <Avatar 
          className="h-10 w-10 ring-2 ring-purple-500/30 neon-glow cursor-pointer hover:ring-purple-400/50 transition-all"
          onClick={() => onViewProfile && onViewProfile(conversation.otherParticipant?.id)}
        >
          <AvatarImage src={conversation.otherParticipant?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
            {conversation.otherParticipant?.display_name?.[0] ||
              conversation.otherParticipant?.username?.[0] ||
              '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 cursor-pointer" onClick={() => onViewProfile && onViewProfile(conversation.otherParticipant?.id)}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white hover:text-purple-400 transition-colors">
              {conversation.otherParticipant?.display_name ||
                conversation.otherParticipant?.username}
            </h3>
            {conversation.otherParticipant?.is_verified && (
              <Badge variant="secondary" className="h-4 text-xs px-1 bg-blue-500/20 text-blue-400 border-blue-500/30">✓</Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 hover:text-purple-400 transition-colors">
            @{conversation.otherParticipant?.username}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="glass-hover">
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/10 text-white">
            <DropdownMenuItem 
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              onClick={handleDeleteConversation}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} group`}
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
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
                          <div className="relative">
                            <div
                              className={`rounded-2xl overflow-hidden backdrop-blur-xl ${
                                isOwn
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white neon-glow'
                                  : 'glass border border-white/10 text-white'
                              }`}
                            >
                              {message.image_url && (
                                <div className="relative">
                                  <img 
                                    src={message.image_url} 
                                    alt="Shared image" 
                                    className="max-w-full max-h-80 object-contain rounded-t-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(message.image_url, '_blank')}
                                  />
                                </div>
                              )}
                              {message.content && message.content !== '📷 Image' && (
                                <p className={`text-sm whitespace-pre-wrap break-words ${message.image_url ? 'px-4 py-2' : 'px-4 py-2'}`}>
                                  {message.content}
                                </p>
                              )}
                            </div>
                            {isOwn && hoveredMessageId === message.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -right-10 top-1/2 -translate-y-1/2 h-7 w-7 glass-hover opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isOwn && (
                              <span className="text-xs text-gray-400">
                                {message.is_read ? (
                                  <CheckCheck className="h-3 w-3 text-blue-400" />
                                ) : (
                                  <Check className="h-3 w-3 text-gray-400" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-white/10 backdrop-blur-xl">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-32 rounded-lg border-2 border-purple-500/30"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {/* Image Upload Button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploadingImage}
            className="glass-hover text-purple-400 hover:text-purple-300"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          
          {/* Emoji Picker Button */}
          <div className="relative">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isSending}
              className="glass-hover text-yellow-400 hover:text-yellow-300"
            >
              <Smile className="h-5 w-5" />
            </Button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  searchPlaceHolder="Search emoji..."
                  width={320}
                  height={400}
                />
              </div>
            )}
          </div>
          
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isUploadingImage ? "Uploading image..." : "Type a message..."}
            className="flex-1 glass border-white/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-gray-400"
            disabled={isSending || isUploadingImage}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!newMessage.trim() && !selectedImage) || isSending || isUploadingImage}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingImage ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
