'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MapPin, Link2, Calendar, Settings, RefreshCw } from 'lucide-react';

export function ProfileHeader({ profile, postsCount = 0, friendsCount = 0, isOwnProfile = false, onEditProfile, onRefresh }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Card className="shadow-lg border-2 overflow-hidden">
      {/* Cover Image */}
      <div className="h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
        {profile?.cover_image_url && (
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <CardHeader className="relative pt-0">
        {/* Avatar */}
        <Avatar className="w-28 h-28 border-4 border-white -mt-14 ring-4 ring-indigo-100 shadow-xl">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-3xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
            {profile?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Edit Profile Button */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-2"
              onClick={onRefresh}
              title="Refresh profile data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-2"
              onClick={onEditProfile}
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        )}

        <div className="pt-4 space-y-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-2xl">
              {profile?.display_name || profile?.username}
            </CardTitle>
            {profile?.is_verified && (
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
            )}
            {profile?.is_private && (
              <Badge variant="secondary">Private</Badge>
            )}
          </div>
          <CardDescription className="text-base">@{profile?.username}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bio */}
        {profile?.bio && (
          <p className="text-base leading-relaxed">{profile.bio}</p>
        )}

        {/* Profile Details */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {profile?.location && (
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {profile.location}
            </div>
          )}
          {profile?.website_url && (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-indigo-600 hover:underline"
            >
              <Link2 className="w-4 h-4 mr-1" />
              {profile.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Joined {formatDate(profile?.created_at)}
          </div>
        </div>

        {/* Stats */}
        <div className="flex space-x-6 pt-2 border-t">
          <div className="text-center">
            <div className="text-xl font-bold">{postsCount}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{friendsCount}</div>
            <div className="text-xs text-muted-foreground">Friends</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
