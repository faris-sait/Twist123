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
  X,
  Reply,
  CornerDownRight
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { compressImage } from '@/lib/imageCompression';

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
  const [fullImageView, setFullImageView] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // WhatsApp-style reply state
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useUser();
  const shouldAutoScrollRef = useRef(true); // Only scroll on initial load
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  
  // Swipe to reply state
  const [swipingMessageId, setSwipingMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const isSwipingRef = useRef(false);
  const swipeThreshold = 20; // Very small threshold - triggers quickly on any intentional swipe

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

  // Global mouse up handler for swipe gestures
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (swipingMessageId) {
        // Find the message being swiped
        const message = messages.find(m => m.id === swipingMessageId);
        if (message && swipeOffset >= swipeThreshold) {
          handleReply(message);
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
        setSwipeOffset(0);
        setSwipingMessageId(null);
        isSwipingRef.current = false;
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [swipingMessageId, swipeOffset, messages]);

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
      // Use the already compressed image preview
      if (selectedImage && imagePreview) {
        imageUrl = imagePreview;
      }

      // Send message with or without image and optional reply
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: messageContent || '📷 Image',
          image_url: imageUrl,
          reply_to_id: replyingTo?.id || null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([...messages, data.message]);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setReplyingTo(null); // Clear reply state after sending
        if (onMessageSent) onMessageSent();
        // Scroll to bottom after sending a message
        setTimeout(() => scrollToBottom(), 100);
        // Focus back on input after sending
        setTimeout(() => inputRef.current?.focus(), 100);
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

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      try {
        // Compress image silently
        const compressedBase64 = await compressImage(file, 5, 1920);
        
        setSelectedImage(file);
        setImagePreview(compressedBase64);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image');
      }
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

  const handleReply = (message) => {
    setReplyingTo(message);
    // Focus on input when replying
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Swipe gesture handlers
  const swipeDirectionRef = useRef(false); // false = right swipe (other's msg), true = left swipe (own msg)
  
  const handleSwipeStart = (e, messageId, isOwn = false) => {
    // Prevent if clicking on buttons or interactive elements
    if (e.target.closest('button') || e.target.closest('a')) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    swipeDirectionRef.current = isOwn; // Store if this is own message (needs left swipe)
    isSwipingRef.current = false;
    setSwipingMessageId(messageId);
    setSwipeOffset(0);
  };

  const handleSwipeMove = (e, message, isOwn = false) => {
    if (!swipingMessageId || swipingMessageId !== message.id) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let deltaX = clientX - swipeStartX.current;
    const deltaY = Math.abs(clientY - swipeStartY.current);
    
    // For own messages, we need to detect LEFT swipe (negative deltaX)
    // For other's messages, we detect RIGHT swipe (positive deltaX)
    if (isOwn) {
      deltaX = -deltaX; // Invert for own messages (left swipe becomes positive)
    }
    
    // Very sensitive - trigger on minimal horizontal movement
    if (deltaX > 3 && deltaX > deltaY * 0.5) {
      isSwipingRef.current = true;
      // More responsive swipe - direct mapping with small max
      const maxSwipe = 60;
      const easedOffset = Math.min(deltaX, maxSwipe);
      setSwipeOffset(easedOffset);
      
      // Prevent scrolling when swiping horizontally
      if (e.cancelable && e.type === 'touchmove') {
        e.preventDefault();
      }
    } else if (deltaY > deltaX * 3) {
      // Only cancel if clearly scrolling vertically
      setSwipingMessageId(null);
      setSwipeOffset(0);
      isSwipingRef.current = false;
    }
  };

  const handleSwipeEnd = (message) => {
    if (!swipingMessageId || swipingMessageId !== message.id) return;
    
    // If swiped past threshold, trigger reply
    if (swipeOffset >= swipeThreshold) {
      handleReply(message);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    // Reset swipe state with animation
    setSwipeOffset(0);
    setSwipingMessageId(null);
    isSwipingRef.current = false;
  };

  const handleSwipeCancel = () => {
    setSwipeOffset(0);
    setSwipingMessageId(null);
    isSwipingRef.current = false;
  };

  // Get display name for reply preview
  const getReplyDisplayName = (message) => {
    if (message.sender_id === currentUserProfileId) {
      return 'You';
    }
    return message.sender?.display_name || message.sender?.username || 'Unknown';
  };

  // Truncate message content for reply preview
  const truncateReplyContent = (content, maxLength = 100) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
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
      {/* Full Image View Modal */}
      {fullImageView && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setFullImageView(null)}
        >
          <div 
            className="p-4 flex items-center gap-3 bg-black/50 backdrop-blur-xl flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullImageView(null)}
              className="glass-hover text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-white font-medium">Image</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img 
              src={fullImageView} 
              alt="Full size" 
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

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
                    const isBeingSwiped = swipingMessageId === message.id;
                    const currentSwipeOffset = isBeingSwiped ? swipeOffset : 0;

                    return (
                      <div
                        key={message.id}
                        id={`message-${message.id}`}
                        className={`relative flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} group transition-colors duration-500`}
                        onMouseEnter={() => !isSwipingRef.current && setHoveredMessageId(message.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        {/* Swipe to reply indicator - positioned based on message ownership */}
                        <div 
                          className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none`}
                          style={{ 
                            opacity: currentSwipeOffset > 5 ? 1 : 0,
                            transform: `translateY(-50%) scale(${currentSwipeOffset >= swipeThreshold ? 1.3 : 1})`
                          }}
                        >
                          <div className={`p-2 rounded-full transition-all duration-100 ${
                            currentSwipeOffset >= swipeThreshold 
                              ? 'bg-purple-500 scale-110' 
                              : 'bg-purple-500/50'
                          }`}>
                            <Reply className={`h-4 w-4 ${
                              currentSwipeOffset >= swipeThreshold 
                                ? 'text-white' 
                                : 'text-purple-200'
                            }`} />
                          </div>
                        </div>

                        {/* Swipeable message container */}
                        <div
                          className={`flex items-end gap-2 w-full ${isOwn ? 'flex-row-reverse' : ''} cursor-grab active:cursor-grabbing`}
                          style={{ 
                            transform: `translateX(${isOwn ? -currentSwipeOffset : currentSwipeOffset}px)`,
                            transition: isBeingSwiped ? 'none' : 'transform 0.15s ease-out',
                            touchAction: 'pan-y pinch-zoom'
                          }}
                          onTouchStart={(e) => handleSwipeStart(e, message.id, isOwn)}
                          onTouchMove={(e) => handleSwipeMove(e, message, isOwn)}
                          onTouchEnd={() => handleSwipeEnd(message)}
                          onTouchCancel={handleSwipeCancel}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSwipeStart(e, message.id, isOwn);
                          }}
                          onMouseMove={(e) => {
                            if (swipingMessageId === message.id) {
                              handleSwipeMove(e, message, isOwn);
                            }
                          }}
                          onMouseUp={() => handleSwipeEnd(message)}
                          onMouseLeave={() => {
                            if (swipingMessageId === message.id) {
                              handleSwipeCancel();
                            }
                          }}
                        >
                          {showAvatar ? (
                            <Avatar className="h-6 w-6 flex-shrink-0 ring-1 ring-purple-500/30 pointer-events-none">
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
                                className={`rounded-2xl overflow-hidden backdrop-blur-xl select-none ${
                                  isOwn
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white neon-glow'
                                    : 'glass border border-white/10 text-white'
                                }`}
                              >
                              {/* Reply Preview - WhatsApp style */}
                              {message.reply_to && (
                                <div 
                                  className={`mx-2 mt-2 px-3 py-2 rounded-lg border-l-4 cursor-pointer ${
                                    isOwn 
                                      ? 'bg-white/10 border-white/50' 
                                      : 'bg-purple-500/20 border-purple-400'
                                  }`}
                                  onClick={() => {
                                    // Scroll to replied message
                                    const replyElement = document.getElementById(`message-${message.reply_to.id}`);
                                    if (replyElement) {
                                      replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      replyElement.classList.add('highlight-message');
                                      setTimeout(() => replyElement.classList.remove('highlight-message'), 2000);
                                    }
                                  }}
                                >
                                  <p className={`text-xs font-semibold ${isOwn ? 'text-white/80' : 'text-purple-300'}`}>
                                    {message.reply_to.sender_id === currentUserProfileId 
                                      ? 'You' 
                                      : message.reply_to.sender?.display_name || message.reply_to.sender?.username || 'Unknown'}
                                  </p>
                                  {message.reply_to.image_url && (
                                    <p className={`text-xs ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>📷 Photo</p>
                                  )}
                                  {message.reply_to.content && message.reply_to.content !== '📷 Image' && (
                                    <p className={`text-xs truncate max-w-[200px] ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
                                      {truncateReplyContent(message.reply_to.content, 50)}
                                    </p>
                                  )}
                                </div>
                              )}
                              {message.image_url && (
                                <img 
                                  src={message.image_url} 
                                  alt="Shared image" 
                                  className="max-w-full max-h-80 object-contain rounded-t-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setFullImageView(message.image_url)}
                                />
                              )}
                              {message.content && message.content !== '📷 Image' && (
                                <p className={`text-sm whitespace-pre-wrap break-words ${message.image_url ? 'px-4 py-2' : 'px-4 py-2'}`}>
                                  {message.content}
                                </p>
                              )}
                            </div>
                            {/* Action buttons on hover */}
                            {hoveredMessageId === message.id && (
                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? '-left-20' : '-right-20'}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 glass-hover"
                                  onClick={() => handleReply(message)}
                                  title="Reply"
                                >
                                  <Reply className="h-4 w-4 text-purple-400" />
                                </Button>
                                {isOwn && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 glass-hover"
                                    onClick={() => handleDeleteMessage(message.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                  </Button>
                                )}
                              </div>
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
        {/* Reply Preview - WhatsApp style */}
        {replyingTo && (
          <div className="mb-3 flex items-start gap-2 p-3 glass rounded-lg border border-purple-500/30">
            <div className="flex-shrink-0 w-1 h-full min-h-[40px] bg-purple-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-purple-400 mb-1">
                Replying to {getReplyDisplayName(replyingTo)}
              </p>
              {replyingTo.image_url && (
                <div className="flex items-center gap-2">
                  <img 
                    src={replyingTo.image_url} 
                    alt="Reply preview" 
                    className="h-10 w-10 rounded object-cover"
                  />
                  <span className="text-xs text-gray-400">📷 Photo</span>
                </div>
              )}
              {replyingTo.content && replyingTo.content !== '📷 Image' && (
                <p className="text-sm text-gray-300 truncate">
                  {truncateReplyContent(replyingTo.content, 80)}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={cancelReply}
              className="flex-shrink-0 h-6 w-6 glass-hover text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

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
            ref={inputRef}
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
