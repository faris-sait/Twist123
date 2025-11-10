'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingFriendId, setRemovingFriendId] = useState(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch friends');
      }

      setFriends(data.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove friend');
      }

      setFriends(friends.filter(f => f.friendship_id !== friendshipId));
      toast.success('Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error(error.message);
    } finally {
      setRemovingFriendId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">Loading friends...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Friends ({friends.length})
          </CardTitle>
        </CardHeader>
      </Card>

      {friends.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState 
              type="friends" 
              message="No friends yet"
              description="Search for users and send friend requests to connect!"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <Card key={friend.friend_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={friend.avatar_url} alt={friend.username} />
                      <AvatarFallback>
                        {friend.display_name?.[0]?.toUpperCase() || friend.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{friend.display_name || friend.username}</h4>
                        {friend.is_verified && (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Friends since {new Date(friend.friends_since).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRemovingFriendId(friend.friendship_id)}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!removingFriendId} onOpenChange={() => setRemovingFriendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this friend? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRemoveFriend(removingFriendId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
