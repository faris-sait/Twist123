'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';

export function FriendRequests({ onRequestHandled }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch friend requests');
      }

      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    setProcessingId(friendshipId);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept friend request');
      }

      setRequests(requests.filter(r => r.id !== friendshipId));
      toast.success('Friend request accepted! 🎉');
      
      if (onRequestHandled) {
        onRequestHandled();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (friendshipId) => {
    setProcessingId(friendshipId);
    try {
      const res = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendship_id: friendshipId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject friend request');
      }

      setRequests(requests.filter(r => r.id !== friendshipId));
      toast.success('Friend request rejected');
      
      if (onRequestHandled) {
        onRequestHandled();
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">Loading friend requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Friend Requests ({requests.length})
          </CardTitle>
        </CardHeader>
      </Card>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState 
              type="requests" 
              message="No pending requests"
              description="When someone sends you a friend request, it will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.requester.avatar_url} alt={request.requester.username} />
                      <AvatarFallback>
                        {request.requester.display_name?.[0]?.toUpperCase() || 
                         request.requester.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          {request.requester.display_name || request.requester.username}
                        </h4>
                        {request.requester.is_verified && (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{request.requester.username}</p>
                      {request.requester.bio && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {request.requester.bio}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                      disabled={processingId === request.id}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
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
