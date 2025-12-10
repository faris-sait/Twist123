'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, X, Users, Check } from 'lucide-react';

export default function NewGroupDialog({ isOpen, onClose, onGroupCreated }) {
  const [step, setStep] = useState(1); // 1: select members, 2: group details
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    } else {
      // Reset state when dialog closes
      setStep(1);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMembers([]);
      setGroupName('');
      setGroupDescription('');
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
        setFriends(data.friends || []);
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
        setSearchResults(data.users || []);
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

  const handleNext = () => {
    if (selectedMembers.length < 1) {
      alert('Please select at least 1 member');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      setIsCreating(true);
      
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          memberIds: selectedMembers.map(m => m.id),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (onGroupCreated) {
          await onGroupCreated(data.groupId);
        }
        onClose();
      } else {
        console.error('Failed to create group:', data.error);
        alert('Failed to create group: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUserItem = (user, showCheckbox = true) => (
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

      {showCheckbox && (
        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
          isSelected(user.id) 
            ? 'bg-green-500 text-white' 
            : 'border-2 border-gray-500'
        }`}>
          {isSelected(user.id) && <Check className="h-4 w-4" />}
        </div>
      )}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass border-white/10 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text flex items-center gap-2">
            <Users className="h-5 w-5 text-green-400" />
            {step === 1 ? 'Select Members' : 'Group Details'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 1 
              ? 'Choose friends to add to your group' 
              : 'Give your group a name and description'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 ? (
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
            <ScrollArea className="h-[300px]">
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
                  <p>No friends yet</p>
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
        ) : (
          <div className="space-y-4">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName" className="text-white">Group Name *</Label>
              <Input
                id="groupName"
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="glass border-white/20 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 text-white placeholder:text-gray-400"
                maxLength={50}
              />
            </div>

            {/* Group Description */}
            <div className="space-y-2">
              <Label htmlFor="groupDescription" className="text-white">Description (optional)</Label>
              <Textarea
                id="groupDescription"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="glass border-white/20 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 text-white placeholder:text-gray-400 min-h-[80px]"
                maxLength={200}
              />
            </div>

            {/* Selected Members Preview */}
            <div className="space-y-2">
              <Label className="text-white">Members ({selectedMembers.length + 1})</Label>
              <div className="flex flex-wrap gap-2 p-3 glass rounded-lg">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  You (Admin)
                </Badge>
                {selectedMembers.map(member => (
                  <Badge
                    key={member.id}
                    className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                  >
                    {member.display_name || member.username}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="glass-hover border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedMembers.length < 1}
                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                className="glass-hover border-white/20 text-white"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || isCreating}
                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
