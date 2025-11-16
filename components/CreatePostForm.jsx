'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PenSquare, Loader2, Image as ImageIcon, Smile, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage, formatFileSize, getBase64Size } from '@/lib/imageCompression';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😊', '👍', '❤️', '🎉', '🔥', '✨', '💯', '🙌', '👏', '🎊', '💪', '🌟', '⭐', '💖'];

export function CreatePostForm({ profile, onPostCreated }) {
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + images.length > 4) {
      toast.error('You can only upload up to 4 images');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      try {
        // Compress image silently
        const compressedBase64 = await compressImage(file, 5, 1920);
        
        setImages((prev) => [...prev, compressedBase64]);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji) => {
    setContent((prev) => prev + emoji);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() && images.length === 0) {
      toast.error('Post must have content or images');
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          is_public: true,
          media_urls: images,
          location: location || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      setContent('');
      setImages([]);
      setLocation('');
      setShowLocationInput(false);
      if (onPostCreated) onPostCreated(data.post);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="glass card-glow border-white/10 hover:border-purple-500/50 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gradient-text">
          <PenSquare className="w-5 h-5 mr-2" />
          Create a Post
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10 ring-2 ring-purple-500/50 neon-glow">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="resize-none glass border-white/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-white/10"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={() => removeImage(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Location Input */}
          {showLocationInput && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Add location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLocationInput(false);
                  setLocation('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 text-muted-foreground">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hover:text-indigo-600"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 4}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Photo {images.length > 0 && `(${images.length}/4)`}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hover:text-indigo-600"
                >
                  <Smile className="w-4 h-4 mr-2" />
                  Emoji
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-5 gap-2">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hover:text-indigo-600"
              onClick={() => setShowLocationInput(!showLocationInput)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {content.length > 0 && `${content.length} characters`}
          </div>
          <Button
            type="submit"
            disabled={isCreating || (!content.trim() && images.length === 0)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
