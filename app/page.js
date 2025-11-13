'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// Import our new components
import { LandingPage } from '@/components/LandingPage';
import { Navigation } from '@/components/Navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PostCard } from '@/components/PostCard';
import { CreatePostForm } from '@/components/CreatePostForm';
import { ProfileHeader } from '@/components/ProfileHeader';
import { EmptyState } from '@/components/EmptyState';
import { UserSearch } from '@/components/UserSearch';
import { FriendsList } from '@/components/FriendsList';
import { FriendRequests } from '@/components/FriendRequests';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import NotificationsList from '@/components/NotificationsList';
import MessagesView from '@/components/MessagesView';
import { UserProfileView } from '@/components/UserProfileView';

export default function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);

  // Profile creation form
  const [profileForm, setProfileForm] = useState({
    username: '',
    display_name: '',
    bio: '',
  });

  useEffect(() => {
    if (isSignedIn) {
      // Fetch all data in parallel and wait for critical data before showing UI
      const loadInitialData = async () => {
        try {
          // Wait for profile and posts (critical for home page)
          await Promise.all([
            fetchProfile(),
            fetchPosts()
          ]);
          
          // Fetch other data in background (non-blocking)
          fetchFriendRequestsCount();
          fetchNotificationsCount();
          fetchUnreadMessagesCount();
          fetchFriendsCount();
        } catch (error) {
          console.error('Error loading initial data:', error);
        } finally {
          // Always turn off loading, even if there's an error
          setLoading(false);
        }
      };
      
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  // Debug: Log when activeTab or profile changes
  useEffect(() => {
    console.log('Active Tab:', activeTab);
    console.log('Profile State:', profile);
  }, [activeTab, profile]);

  const fetchFriendRequestsCount = async () => {
    try {
      const res = await fetch('/api/friends/requests');
      const data = await res.json();
      if (res.ok) {
        setFriendRequestsCount(data.requests?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching friend requests count:', error);
    }
  };

  const fetchNotificationsCount = async () => {
    try {
      const res = await fetch('/api/notifications?unread=true');
      const data = await res.json();
      if (res.ok) {
        setNotificationsCount(data.notifications?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications count:', error);
    }
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (res.ok) {
        const totalUnread = data.conversations?.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0) || 0;
        setUnreadMessagesCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  };

  const fetchFriendsCount = async () => {
    try {
      const res = await fetch('/api/friends');
      const data = await res.json();
      if (res.ok) {
        setFriendsCount(data.friends?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching friends count:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile...');
      const res = await fetch('/api/profile');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Profile API response:', data);
      console.log('Profile data:', data.profile);
      
      if (data.profile) {
        console.log('Setting profile:', data.profile);
        setProfile(data.profile);
        setShowCreateProfile(false);
      } else {
        console.log('No profile found, showing create profile screen');
        setShowCreateProfile(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to fetch profile');
      // Don't block the app, just show create profile screen
      setShowCreateProfile(true);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts?limit=20');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Set empty array on error to avoid showing loading forever
      setPosts([]);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    
    if (!profileForm.username) {
      toast.error('Username is required');
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create profile');
      }

      setProfile(data.profile);
      setShowCreateProfile(false);
      toast.success('Profile created successfully! 🎉');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error(error.message);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setActiveTab('home'); // Switch to home tab after creating post
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Close profile view when changing tabs
    setViewingUserId(null);
    // Refresh posts when home tab is clicked
    if (tab === 'home') {
      fetchPosts();
    }
  };

  const handlePostDeleted = (postId) => {
    console.log('handlePostDeleted called with postId:', postId);
    console.log('Current posts:', posts);
    setPosts((prevPosts) => {
      const filtered = prevPosts.filter(p => p.id !== postId);
      console.log('Filtered posts:', filtered);
      return filtered;
    });
  };

  const handleRequestHandled = () => {
    // Refresh friend requests count when a request is accepted/rejected
    fetchFriendRequestsCount();
  };

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
    toast.success('Profile updated successfully! 🎉');
  };

  const handleMessageUser = async (userId) => {
    try {
      // Create or get conversation with this user
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: userId }),
      });

      if (res.ok) {
        // Close profile view if open
        setViewingUserId(null);
        // Switch to messages tab
        setActiveTab('messages');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const handleViewProfile = (userId) => {
    // Don't allow viewing own profile this way - use the profile tab instead
    if (userId === profile?.id) {
      setActiveTab('profile');
      return;
    }
    setViewingUserId(userId);
  };

  const handleBackFromProfile = () => {
    setViewingUserId(null);
  };

  // Loading state
  if (!isLoaded || loading) {
    return <LoadingSpinner message="Loading TWIST..." fullScreen={true} />;
  }

  // Not signed in - show landing page
  if (!isSignedIn) {
    return <LandingPage />;
  }

  // Create profile screen
  if (showCreateProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Toaster richColors position="top-center" />
        <Card className="w-full max-w-lg glass card-glow border-white/10">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 neon-glow">
              <span className="text-3xl font-bold text-white">T</span>
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">Create Your Profile</CardTitle>
            <p className="text-muted-foreground">
              Let's set up your TWIST profile to get started
            </p>
          </CardHeader>
          <form onSubmit={handleCreateProfile}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="@username"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  placeholder="Your name"
                  value={profileForm.display_name}
                  onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Create Profile
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />
      
      {/* Navigation */}
      <Navigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        friendRequestsCount={friendRequestsCount}
        notificationsCount={notificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User Profile View - Shows when clicking on a user */}
        {viewingUserId && (
          <UserProfileView
            userId={viewingUserId}
            currentUserId={profile?.id}
            onBack={handleBackFromProfile}
            onMessageUser={handleMessageUser}
          />
        )}

        {/* Home Tab - Posts Feed Only */}
        {!viewingUserId && activeTab === 'home' && (
          <div className="space-y-6">
            {/* Posts Feed */}
            {posts.length === 0 ? (
              <EmptyState type="posts" />
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={profile?.id}
                  onDelete={handlePostDeleted}
                  onViewProfile={handleViewProfile}
                />
              ))
            )}
          </div>
        )}

        {/* Create Post Tab */}
        {!viewingUserId && activeTab === 'create' && (
          <div className="space-y-6">
            <CreatePostForm profile={profile} onPostCreated={handlePostCreated} />
          </div>
        )}

        {/* Search Users Tab */}
        {!viewingUserId && activeTab === 'search' && <UserSearch onMessageUser={handleMessageUser} />}

        {/* Messages Tab */}
        {!viewingUserId && activeTab === 'messages' && <MessagesView onViewProfile={handleViewProfile} />}

        {/* Friends Tab */}
        {!viewingUserId && activeTab === 'friends' && <FriendsList />}

        {/* Friend Requests Tab */}
        {!viewingUserId && activeTab === 'requests' && (
          <FriendRequests onRequestHandled={handleRequestHandled} />
        )}

        {/* Profile Tab */}
        {!viewingUserId && activeTab === 'profile' && (
          <div className="space-y-6">
            {!loading && profile ? (
              <>
                <ProfileHeader
                  profile={profile}
                  postsCount={posts.filter(p => p.author_id === profile.id).length}
                  friendsCount={friendsCount}
                  isOwnProfile={true}
                  onEditProfile={() => setShowEditProfile(true)}
                />

                {/* User's Posts */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Your Posts</h2>
                  {posts.filter(p => p.author_id === profile.id).length === 0 ? (
                    <EmptyState type="posts" />
                  ) : (
                    posts
                      .filter(p => p.author_id === profile.id)
                      .map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={profile?.id}
                          onDelete={handlePostDeleted}
                          onViewProfile={handleViewProfile}
                        />
                      ))
                  )}
                </div>
              </>
            ) : loading ? (
              <Card className="p-8">
                <p className="text-center text-muted-foreground">Loading profile...</p>
              </Card>
            ) : !profile ? (
              <Card className="p-8">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">No profile found</p>
                  <Button 
                    onClick={() => setShowCreateProfile(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600"
                  >
                    Create Profile
                  </Button>
                </div>
              </Card>
            ) : null}
          </div>
        )}

        {/* Notifications Tab */}
        {!viewingUserId && activeTab === 'notifications' && (
          <NotificationsList
            onNotificationClick={(notification) => {
              fetchNotificationsCount(); // Refresh count
              
              // Redirect based on notification type
              switch (notification.type) {
                case 'friend_request':
                  // Redirect to friend requests tab
                  setActiveTab('requests');
                  break;
                case 'friend_accepted':
                  // Redirect to friends tab
                  setActiveTab('friends');
                  break;
                case 'friend_post':
                case 'comment':
                case 'like':
                  // Redirect to home feed to see the post
                  setActiveTab('home');
                  break;
                default:
                  break;
              }
            }}
          />
        )}
      </main>

      {/* Edit Profile Dialog */}
      {profile && (
        <EditProfileDialog
          profile={profile}
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
}
