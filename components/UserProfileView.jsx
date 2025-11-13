'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/PostCard';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Link2, 
  CheckCircle2,
  UserPlus,
  UserCheck,
  MessageCircle,
  Users
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function UserProfileView({ userId, onBack, currentUserId, onMessageUser }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState(null); // null, 'friends', 'pending_sent', 'pending_received', 'none'
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [stats, setStats] = useState({
    postsCount: 0,
    friendsCount: 0
  });

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchUserPosts();
      fetchFriendshipStatus();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.profile);
      } else {
        console.error('Error fetching user profile:', data.error);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/posts`);
      const data = await response.json();
      
      if (response.ok) {
        setPosts(data.posts || []);
        setStats(prev => ({ ...prev, postsCount: data.posts?.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendshipStatus = async () => {
    try {
      console.log('Fetching friendship status for userId:', userId);
      const response = await fetch(`/api/friends/status/${userId}`);
      const data = await response.json();
      
      console.log('Friendship status response:', data);
      
      if (response.ok) {
        setFriendshipStatus(data.status);
        if (data.status === 'friends') {
          setStats(prev => ({ ...prev, friendsCount: data.friendsCount || 0 }));
        }
      } else {
        console.error('Error response:', data);
      }
    } catch (error) {
      console.error('Error fetching friendship status:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    setIsLoadingAction(true);
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId })
      });

      if (response.ok) {
        setFriendshipStatus('pending_sent');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    setIsLoadingAction(true);
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId })
      });

      if (response.ok) {
        setFriendshipStatus('friends');
        fetchFriendshipStatus(); // Refresh to get friend count
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleSendMessage = async () => {
    if (onMessageUser) {
      // Use the parent's message handler if provided
      onMessageUser(userId);
    } else {
      // Fallback to creating conversation and navigating
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otherUserId: userId })
        });

        if (response.ok) {
          // Use window.location to change tab parameter
          window.location.href = '/?tab=messages';
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner message="Loading profile..." />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-400 mb-4">User not found</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="glass-hover"
        >
          <ArrowLeft className="h-5 w-5 text-purple-400" />
        </Button>
        <h2 className="text-xl font-bold gradient-text">Profile</h2>
      </div>

      {/* Profile Card */}
      <Card className="glass card-glow border-white/10">
        <CardContent className="pt-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <Avatar className="w-24 h-24 ring-4 ring-purple-500/30 neon-glow">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white text-2xl font-semibold">
                {profile.display_name?.[0] || profile.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {profile.display_name || profile.username}
                </h1>
                {profile.is_verified && (
                  <CheckCircle2 className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <p className="text-gray-400">@{profile.username}</p>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                {friendshipStatus === 'none' && (
                  <Button 
                    onClick={handleSendFriendRequest}
                    disabled={isLoadingAction}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                )}
                {friendshipStatus === 'pending_sent' && (
                  <Button disabled variant="outline">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Request Sent
                  </Button>
                )}
                {friendshipStatus === 'pending_received' && (
                  <Button 
                    onClick={handleAcceptFriendRequest}
                    disabled={isLoadingAction}
                    className="bg-gradient-to-r from-green-500 to-blue-500"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Accept Request
                  </Button>
                )}
                {friendshipStatus === 'friends' && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <UserCheck className="h-4 w-4 mr-1" />
                    Friends
                  </Badge>
                )}
                
                {friendshipStatus === 'friends' && (
                  <Button 
                    onClick={handleSendMessage}
                    variant="outline"
                    className="glass-hover"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.postsCount}</p>
                <p className="text-sm text-gray-400">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.friendsCount}</p>
                <p className="text-sm text-gray-400">Friends</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-300 mb-4">{profile.bio}</p>
          )}

          {/* Additional Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-1">
                <Link2 className="h-4 w-4" />
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  {profile.website}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-400" />
          Posts
        </h3>
        
        {posts.length === 0 ? (
          <Card className="glass border-white/10">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">No posts yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
