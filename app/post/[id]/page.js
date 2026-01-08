'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [post, setPost] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Post not found');
        }

        setPost(data.post);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isSignedIn) return;
      
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    if (isLoaded && isSignedIn) {
      fetchProfile();
    }
  }, [isLoaded, isSignedIn]);

  const handleBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleViewProfile = (userId) => {
    router.push(`/?profile=${userId}`);
  };

  const handlePostDeleted = () => {
    toast.success('Post deleted');
    router.push('/');
  };

  if (loading) {
    return <LoadingSpinner message="Loading post..." fullScreen={true} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Toaster richColors position="top-center" />
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Post Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleGoHome} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold gradient-text">Post</h1>
          </div>
        </div>
      </header>

      {/* Post Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {post && (
          <PostCard
            post={post}
            currentUserId={profile?.id}
            onDelete={handlePostDeleted}
            onViewProfile={handleViewProfile}
          />
        )}
      </main>
    </div>
  );
}
