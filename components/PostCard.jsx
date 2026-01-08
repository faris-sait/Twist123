'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share2, Trash2, CheckCircle2, MoreHorizontal, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import CommentsList from './CommentsList';

export function PostCard({ post, currentUserId, onDelete, onViewProfile }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Fetch like status on mount
  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}/like`);
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
          setLikeCount(data.likeCount);
        }
      } catch (error) {
        console.error('Error fetching like status:', error);
      }
    };

    fetchLikeStatus();
  }, [post.id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Like API error:', errorData);
        throw new Error(errorData.error || 'Failed to toggle like');
      }

      const data = await response.json();
      console.log('Like response:', data);
      setIsLiked(data.isLiked);
      setLikeCount(data.likeCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to like post. Please check console for details.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    try {
      // Try to use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.author?.display_name || post.author?.username}`,
          text: post.content,
          url: shareUrl
        });
        setShareCount(shareCount + 1);
        toast.success('Post shared!');
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setShareCount(shareCount + 1);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        // Still try to copy to clipboard as fallback
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard!');
        } catch (clipboardError) {
          toast.error('Failed to share post');
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      console.log('Deleting post:', post.id);
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', res.status);
      const data = await res.json();
      console.log('Delete response data:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete post');
      }

      if (onDelete) {
        console.log('Calling onDelete with post.id:', post.id);
        onDelete(post.id);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnPost = currentUserId === post.author_id;

  return (
    <Card className="glass card-glow border-white/10 hover:border-blue-500/50 transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar 
              className="w-12 h-12 ring-2 ring-blue-500/50 neon-glow cursor-pointer"
              onClick={() => onViewProfile && onViewProfile(post.author_id)}
            >
              <AvatarImage src={post.author?.avatar_url} alt={post.author?.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                {post.author?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span 
                  className="font-semibold text-base hover:text-blue-400 cursor-pointer transition-colors"
                  onClick={() => onViewProfile && onViewProfile(post.author_id)}
                >
                  {post.author?.display_name || post.author?.username}
                </span>
                {post.author?.is_verified && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                )}
                {!post.is_public && (
                  <Badge variant="secondary" className="text-xs">Private</Badge>
                )}
              </div>
              <span 
                className="text-sm text-muted-foreground hover:text-blue-400 cursor-pointer transition-colors"
                onClick={() => onViewProfile && onViewProfile(post.author_id)}
              >
                @{post.author?.username}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">{formatDate(post.created_at)}</span>
            {isOwnPost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete post'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base whitespace-pre-wrap leading-relaxed">{post.content}</p>
        
        {/* Location */}
        {post.location && (
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <MapPin className="w-4 h-4 mr-1" />
            {post.location}
          </div>
        )}
        
        {/* Images */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`mt-4 grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media_urls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Post media ${idx + 1}`}
                className={`rounded-lg object-cover w-full ${post.media_urls.length === 1 ? 'h-96' : 'h-48'}`}
              />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`transition-all ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'}`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
          {likeCount > 0 ? likeCount : 'Like'}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleComment}
          className={`transition-all ${showComments ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {commentCount > 0 ? commentCount : 'Comment'}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleShare}
          className="text-muted-foreground hover:text-green-500 transition-all"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {shareCount > 0 ? shareCount : 'Share'}
        </Button>
      </CardFooter>
      
      {/* Comments Section */}
      {showComments && (
        <CardContent className="pt-0">
          <CommentsList
            postId={post.id}
            commentCount={commentCount}
            onCommentCountChange={setCommentCount}
          />
        </CardContent>
      )}
    </Card>
  );
}
