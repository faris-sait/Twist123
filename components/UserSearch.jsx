'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check, Clock, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export function UserSearch({ onMessageUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setSearchPerformed(true);

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search users');
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
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
                placeholder="Search by username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchPerformed && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">
            {users.length > 0 ? `Found ${users.length} user${users.length === 1 ? '' : 's'}` : 'No users found'}
          </h3>
          
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
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
    </div>
  );
}
