'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check, Clock, X, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function UserSearch({ onMessageUser, onViewProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Debounced search function
  const performSearch = useCallback(async (query) => {
    if (query.length === 0) {
      setUsers([]);
      setSearchPerformed(false);
      return;
    }

    // Search starts with just 1 character
    setLoading(true);
    setSearchPerformed(true);

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search users');
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      // Silently handle errors - don't show toast for search failures
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce the search - wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    // Cleanup: cancel the timer if searchQuery changes before 300ms
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSearch = async (e) => {
    e.preventDefault();
    // Form submit will trigger immediate search
    if (searchQuery.length >= 1) {
      performSearch(searchQuery);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressee_id: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send friend request');
      }

      // Update user's friendship status in the list
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, friendship_status: 'pending', is_requester: true }
          : user
      ));

      toast.success('Friend request sent! 🎉');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error(error.message);
    }
  };

  const getFriendshipButton = (user) => {
    switch (user.friendship_status) {
      case 'accepted':
        return (
          <Button size="sm" variant="secondary" disabled>
            <Check className="w-4 h-4 mr-2" />
            Friends
          </Button>
        );
      case 'pending':
        return user.is_requester ? (
          <Button size="sm" variant="secondary" disabled>
            <Clock className="w-4 h-4 mr-2" />
            Pending
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            Respond in Requests
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            onClick={() => handleSendRequest(user.id)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Start typing to search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Results appear as you type
          </p>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchPerformed && users.length > 0 && (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onViewProfile && onViewProfile(user.id)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                      <AvatarFallback>
                        {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{user.display_name || user.username}</h4>
                        {user.is_verified && (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.friends_count || 0} friend{user.friends_count === 1 ? '' : 's'}
                      </p>
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex gap-2">
                    {user.friendship_status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMessageUser && onMessageUser(user.id)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    )}
                    {getFriendshipButton(user)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No results message */}
      {searchPerformed && !loading && users.length === 0 && searchQuery.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
