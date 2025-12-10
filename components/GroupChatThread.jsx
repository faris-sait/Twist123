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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  CornerDownRight,
  Users,
  Settings,
  UserPlus,
  LogOut,
  Crown,
  Shield,
  Search,
  Loader2
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { compressImage } from '@/lib/imageCompression';

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function GroupChatThread({ group, onBack, onMessageSent, onGroupDeleted, onGroupLeft, onViewProfile }) {
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [myRole, setMyRole] = useState('member');
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useUser();
  const shouldAutoScrollRef = useRef(true);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  
  // Swipe to reply state
  const [swipingMessageId, setSwipingMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const isSwipingRef = useRef(false);
  const swipeThreshold = 25;

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (group) {
      fetchMessages();
      fetchGroupMembers();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [group]);

  useEffect(() => {
    if (shouldAutoScrollRef.current && messages.length > 0) {
      scrollToBottom();
      shouldAutoScrollRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (swipingMessageId) {
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
      // Reuse conversations messages API since groups use the same table
      const response = await fetch(`/api/conversations/${group.id}/messages`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/members`);
      const data = await response.json();
      
      if (response.ok) {
        setGroupMembers(data.members || []);
        setMyRole(data.myRole || 'member');
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || isSending) return;

    const messageContent = newMessage.trim();
    let imageUrl = null;

    setIsSending(true);

    try {
      if (selectedImage && imagePreview) {
        imageUrl = imagePreview;
      }

      const response = await fetch(`/api/conversations/${group.id}/messages`, {
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
        setReplyingTo(null);
        if (onMessageSent) onMessageSent();
        setTimeout(() => scrollToBottom(), 100);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
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
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const swipeDirectionRef = useRef(false);
  
  const handleSwipeStart = (e, messageId, isOwn = false) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    swipeDirectionRef.current = isOwn;
    isSwipingRef.current = false;
    setSwipingMessageId(messageId);
    setSwipeOffset(0);
  };

  const handleSwipeMove = (e, message, isOwn = false) => {
    if (!swipingMessageId || swipingMessageId !== message.id) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rawDeltaX = clientX - swipeStartX.current;
    const deltaY = Math.abs(clientY - swipeStartY.current);
    
    const isCorrectDirection = isOwn ? rawDeltaX < 0 : rawDeltaX > 0;
    const deltaX = Math.abs(rawDeltaX);
    
    if (isCorrectDirection && deltaX > 5 && deltaX > deltaY) {
      isSwipingRef.current = true;
      const maxSwipe = 70;
      const easedOffset = Math.min(deltaX, maxSwipe);
      setSwipeOffset(easedOffset);
      
      if (e.cancelable && e.type === 'touchmove') {
        e.preventDefault();
      }
    } else if (deltaY > deltaX * 2) {
      setSwipingMessageId(null);
      setSwipeOffset(0);
      isSwipingRef.current = false;
    }
  };

  const handleSwipeEnd = (message) => {
    if (!swipingMessageId || swipingMessageId !== message.id) return;
    
    if (swipeOffset >= swipeThreshold) {
      handleReply(message);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    setSwipeOffset(0);
    setSwipingMessageId(null);
    isSwipingRef.current = false;
  };

  const handleSwipeCancel = () => {
    setSwipeOffset(0);
    setSwipingMessageId(null);
    isSwipingRef.current = false;
  };

  const getReplyDisplayName = (message) => {
    if (message.sender_id === currentUserProfileId) {
      return 'You';
    }
    return message.sender?.display_name || message.sender?.username || 'Unknown';
  };

  const truncateReplyContent = (content, maxLength = 100) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/conversations/${group.id}/messages/${messageId}`, {
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

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await fetch(`/api/groups/${group.id}/members/${currentUserProfileId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        if (data.groupDeleted) {
          if (onGroupDeleted) onGroupDeleted();
        } else {
          if (onGroupLeft) onGroupLeft();
        }
      } else {
        alert(data.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? All messages will be permanently deleted.')) return;

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (onGroupDeleted) onGroupDeleted();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/groups/${group.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchGroupMembers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handlePromoteMember = async (memberId) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });

      if (response.ok) {
        fetchGroupMembers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to promote member');
      }
    } catch (error) {
      console.error('Error promoting member:', error);
    }
  };

  const handleDemoteMember = async (memberId) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      });

      if (response.ok) {
        fetchGroupMembers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to demote member');
      }
    } catch (error) {
      console.error('Error demoting member:', error);
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  // Find reply-to message
  const findReplyToMessage = (replyToId) => {
    return messages.find(m => m.id === replyToId);
  };

  const isAdmin = myRole === 'admin';
  const isCreator = group.created_by === currentUserProfileId;

  return (
    <div className="flex-1 flex flex-col glass h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 backdrop-blur-xl flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden glass-hover"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        
        <button
          onClick={() => setShowMembersDialog(true)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <Avatar className="h-10 w-10 ring-2 ring-green-500/30 neon-glow">
            <AvatarImage src={group.group_avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-green-500 via-teal-500 to-cyan-500 text-white font-semibold">
              {group.group_name?.[0] || 'G'}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{group.group_name}</h3>
              {isAdmin && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {groupMembers.length || group.memberCount} members • Tap for info
            </p>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="glass-hover">
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/10 text-white">
            <DropdownMenuItem
              onClick={() => setShowMembersDialog(true)}
              className="hover:bg-white/10 cursor-pointer"
            >
              <Users className="h-4 w-4 mr-2 text-blue-400" />
              View Members
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                onClick={() => setShowAddMembersDialog(true)}
                className="hover:bg-white/10 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 mr-2 text-green-400" />
                Add Members
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleLeaveGroup}
              className="hover:bg-white/10 cursor-pointer text-yellow-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Group
            </DropdownMenuItem>
            {isCreator && (
              <DropdownMenuItem
                onClick={handleDeleteGroup}
                className="hover:bg-white/10 cursor-pointer text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-green-500/30" />
              <p className="text-lg mb-1">No messages yet</p>
              <p className="text-sm">Be the first to send a message!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserProfileId;
              const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
              const isBeingSwiped = swipingMessageId === message.id;
              const replyToMessage = message.reply_to_id ? findReplyToMessage(message.reply_to_id) : null;

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <Badge variant="outline" className="glass border-white/10 text-gray-400 text-xs">
                        {formatMessageDate(message.created_at)}
                      </Badge>
                    </div>
                  )}
                  
                  <div
                    className={`flex items-end gap-2 group relative ${isOwn ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => {
                      setHoveredMessageId(null);
                      handleSwipeCancel();
                    }}
                  >
                    {/* Reply icon indicator for swipe */}
                    {!isOwn && (
                      <div 
                        className={`absolute left-0 flex items-center justify-center transition-all duration-150 ${
                          isBeingSwiped && swipeOffset > 0 ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ 
                          transform: `translateX(${Math.min(swipeOffset - 30, 20)}px)`,
                        }}
                      >
                        <div className={`rounded-full p-2 ${swipeOffset >= swipeThreshold ? 'bg-green-500/30' : 'bg-gray-500/30'}`}>
                          <Reply className={`h-4 w-4 ${swipeOffset >= swipeThreshold ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div 
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      style={{
                        transform: isBeingSwiped 
                          ? `translateX(${isOwn ? -swipeOffset : swipeOffset}px)` 
                          : 'translateX(0)',
                        transition: isBeingSwiped ? 'none' : 'transform 0.2s ease-out'
                      }}
                      onMouseDown={(e) => handleSwipeStart(e, message.id, isOwn)}
                      onMouseMove={(e) => handleSwipeMove(e, message, isOwn)}
                      onMouseUp={() => handleSwipeEnd(message)}
                      onTouchStart={(e) => handleSwipeStart(e, message.id, isOwn)}
                      onTouchMove={(e) => handleSwipeMove(e, message, isOwn)}
                      onTouchEnd={() => handleSwipeEnd(message)}
                    >
                      {/* Avatar for other users */}
                      {!isOwn && (
                        <button
                          onClick={() => onViewProfile && onViewProfile(message.sender_id)}
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-8 w-8 ring-1 ring-purple-500/30">
                            <AvatarImage src={message.sender?.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                              {message.sender?.display_name?.[0] || message.sender?.username?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      )}

                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {/* Sender name for group messages */}
                        {!isOwn && (
                          <p className="text-xs text-gray-400 mb-1 ml-1">
                            {message.sender?.display_name || message.sender?.username}
                          </p>
                        )}

                        {/* Reply preview */}
                        {replyToMessage && (
                          <div 
                            className={`mb-1 p-2 rounded-lg border-l-2 ${
                              isOwn 
                                ? 'bg-purple-500/10 border-purple-500/50' 
                                : 'bg-white/5 border-green-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <CornerDownRight className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-medium text-gray-300">
                                {getReplyDisplayName(replyToMessage)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {replyToMessage.image_url && '📷 '}
                              {truncateReplyContent(replyToMessage.content)}
                            </p>
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwn
                              ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-br-md'
                              : 'glass border border-white/10 text-white rounded-bl-md'
                          }`}
                        >
                          {/* Image */}
                          {message.image_url && (
                            <button
                              onClick={() => setFullImageView(message.image_url)}
                              className="block mb-2 max-w-xs"
                            >
                              <img 
                                src={message.image_url} 
                                alt="Shared image" 
                                className="rounded-lg max-w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity"
                              />
                            </button>
                          )}
                          
                          {/* Message text */}
                          {message.content && message.content !== '📷 Image' && (
                            <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          )}
                          
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] opacity-60">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isOwn && (
                              <span className="text-[10px]">
                                {message.is_read ? (
                                  <CheckCheck className="h-3 w-3 text-green-300 inline" />
                                ) : (
                                  <Check className="h-3 w-3 opacity-60 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message actions */}
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'order-first' : ''}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 glass-hover"
                          onClick={() => handleReply(message)}
                        >
                          <Reply className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 glass-hover"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Reply icon indicator for own messages (right side) */}
                    {isOwn && (
                      <div 
                        className={`absolute right-0 flex items-center justify-center transition-all duration-150 ${
                          isBeingSwiped && swipeOffset > 0 ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ 
                          transform: `translateX(${Math.max(-swipeOffset + 30, -20)}px)`,
                        }}
                      >
                        <div className={`rounded-full p-2 ${swipeOffset >= swipeThreshold ? 'bg-green-500/30' : 'bg-gray-500/30'}`}>
                          <Reply className={`h-4 w-4 ${swipeOffset >= swipeThreshold ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Full Image View Modal */}
      {fullImageView && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullImageView(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 glass-hover"
            onClick={() => setFullImageView(null)}
          >
            <X className="h-6 w-6 text-white" />
          </Button>
          <img 
            src={fullImageView} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-white/10 bg-green-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-1 h-10 bg-green-500 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-400">
                  Replying to {getReplyDisplayName(replyingTo)}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  {replyingTo.image_url && '📷 '}
                  {truncateReplyContent(replyingTo.content, 50)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelReply}
              className="h-8 w-8 glass-hover flex-shrink-0"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-white/10">
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-20 rounded-lg object-cover"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3 text-white" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="glass-hover"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-5 w-5 text-gray-400" />
            </Button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  emojiStyle="native"
                  width={300}
                  height={400}
                />
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="glass-hover"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            <ImageIcon className="h-5 w-5 text-gray-400" />
          </Button>
          
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 glass border-white/20 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 text-white placeholder:text-gray-400"
            disabled={isSending}
          />
          
          <Button
            type="submit"
            size="icon"
            disabled={(!newMessage.trim() && !selectedImage) || isSending}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white neon-glow-green disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="glass border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              Group Members ({groupMembers.length})
            </DialogTitle>
            {group.group_description && (
              <DialogDescription className="text-gray-400">
                {group.group_description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {groupMembers.map((member) => {
                const isMemberAdmin = member.role === 'admin';
                const isMemberCreator = member.id === group.created_by;
                const isCurrentUser = member.id === currentUserProfileId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg glass-hover"
                  >
                    <button
                      onClick={() => {
                        if (!isCurrentUser) {
                          setShowMembersDialog(false);
                          onViewProfile && onViewProfile(member.id);
                        }
                      }}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-purple-500/30">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {member.display_name?.[0] || member.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.display_name || member.username}
                            {isCurrentUser && ' (You)'}
                          </span>
                          {isMemberCreator && (
                            <Crown className="h-4 w-4 text-yellow-400" />
                          )}
                          {isMemberAdmin && !isMemberCreator && (
                            <Shield className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          @{member.username}
                        </span>
                      </div>
                    </button>

                    {/* Admin actions */}
                    {isAdmin && !isCurrentUser && !isMemberCreator && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10 text-white">
                          {isMemberAdmin ? (
                            <DropdownMenuItem
                              onClick={() => handleDemoteMember(member.id)}
                              className="hover:bg-white/10 cursor-pointer"
                            >
                              Remove Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handlePromoteMember(member.id)}
                              className="hover:bg-white/10 cursor-pointer"
                            >
                              <Shield className="h-4 w-4 mr-2 text-green-400" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="hover:bg-white/10 cursor-pointer text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMembersDialog(false)}
              className="glass-hover border-white/20"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <AddMembersDialog
        isOpen={showAddMembersDialog}
        onClose={() => setShowAddMembersDialog(false)}
        groupId={group.id}
        existingMemberIds={groupMembers.map(m => m.id)}
        onMembersAdded={() => {
          fetchGroupMembers();
          setShowAddMembersDialog(false);
        }}
      />
    </div>
  );
}

// Add Members Dialog Component
function AddMembersDialog({ isOpen, onClose, groupId, existingMemberIds, onMembersAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMembers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const debounce = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      
      if (response.ok) {
        // Filter out existing members
        const availableFriends = (data.friends || []).filter(
          f => !existingMemberIds.includes(f.friend_id)
        );
        setFriends(availableFriends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        // Filter out existing members
        const availableUsers = (data.users || []).filter(
          u => !existingMemberIds.includes(u.id)
        );
        setSearchResults(availableUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMember = (user) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === user.id);
      if (isSelected) {
        return prev.filter(m => m.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const isSelected = (userId) => {
    return selectedMembers.some(m => m.id === userId);
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) return;

    try {
      setIsAdding(true);
      
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds: selectedMembers.map(m => m.id),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onMembersAdded();
      } else {
        alert(data.error || 'Failed to add members');
      }
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Error adding members. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const renderUserItem = (user) => (
    <button
      key={user.id}
      onClick={() => toggleMember(user)}
      className={`w-full p-3 flex items-center gap-3 rounded-lg transition-all text-left ${
        isSelected(user.id)
          ? 'bg-green-500/20 border border-green-500/30'
          : 'glass-hover'
      }`}
    >
      <Avatar className="h-10 w-10 ring-2 ring-purple-500/30">
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
          {user.display_name?.[0] || user.username?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {user.display_name || user.username}
          </span>
          {user.is_verified && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              ✓
            </Badge>
          )}
        </div>
        <span className="text-sm text-gray-400">@{user.username}</span>
      </div>

      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
        isSelected(user.id) 
          ? 'bg-green-500 text-white' 
          : 'border-2 border-gray-500'
      }`}>
        {isSelected(user.id) && <Check className="h-4 w-4" />}
      </div>
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass border-white/10 backdrop-blur-2xl text-white">
        <DialogHeader>
          <DialogTitle className="gradient-text flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-400" />
            Add Members
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select people to add to this group
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 glass rounded-lg">
              {selectedMembers.map(member => (
                <Badge
                  key={member.id}
                  className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1 pr-1"
                >
                  {member.display_name || member.username}
                  <button
                    onClick={() => toggleMember(member)}
                    className="ml-1 hover:bg-green-500/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 glass border-white/20 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Search Results or Friends List */}
          <ScrollArea className="h-[250px]">
            {isSearching ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
              </div>
            ) : searchQuery.trim() ? (
              searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No users found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(user => renderUserItem(user))}
                </div>
              )
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No friends available to add</p>
                <p className="text-sm mt-1">Search for users to add them</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-400 mb-2">Your Friends</p>
                {friends.map(friend => renderUserItem({
                  id: friend.friend_id,
                  username: friend.username,
                  display_name: friend.display_name,
                  avatar_url: friend.avatar_url,
                  is_verified: friend.is_verified
                }))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="glass-hover border-white/20 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0 || isAdding}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
