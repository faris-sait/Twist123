'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';

export default function NewMessageDialog({ isOpen, onClose, onConversationCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
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

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (userId) => {
    try {
      setIsCreating(true);
      console.log('Starting conversation with user:', userId);
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: userId }),
      });

      const data = await response.json();
      console.log('Conversation response:', data);

      if (response.ok) {
        if (onConversationCreated) {
          await onConversationCreated(data.conversationId, userId);
        }
      } else {
        console.error('Failed to create conversation:', data.error);
        alert('Failed to start conversation: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error starting conversation. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass border-white/10 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">New Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 glass border-white/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-gray-400"
              autoFocus
            />
          </div>

          {/* Search Results */}
          <ScrollArea className="h-[300px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No users found</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user.id)}
                    disabled={isCreating}
                    className="w-full p-3 flex items-center gap-3 glass-hover rounded-lg transition-all disabled:opacity-50"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-purple-500/30">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white">
                        {user.display_name?.[0] || user.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-white">
                          {user.display_name || user.username}
                        </span>
                        {user.is_verified && (
                          <Badge variant="secondary" className="h-4 text-xs px-1 bg-blue-500/20 text-blue-400 border-blue-500/30">✓</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                    </div>

                    {isCreating && (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Search for users to start a conversation</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
