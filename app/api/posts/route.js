import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/redis/client';

// GET /api/posts - Get posts feed (all public posts)
export async function GET(request) {
  try {
    const supabase = await createClerkSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch posts with Redis caching
    const posts = await getCachedOrFetch(
      CACHE_KEYS.feed(limit, offset),
      CACHE_TTL.FEED,
      async () => {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
      }
    );

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create new post
export async function POST(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    
    const body = await request.json();
    const { content, media_urls, media_types, is_public } = body;

    // Validate: post must have content OR media
    if (!content && (!media_urls || media_urls.length === 0)) {
      return NextResponse.json(
        { error: 'Post must have content or media' },
        { status: 400 }
      );
    }

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found. Please create a profile first.' },
        { status: 404 }
      );
    }

    // Create post
    const { data, error } = await supabase
      .from('posts')
      .insert([{
        author_id: profile.id,
        content: content || '',
        media_urls: media_urls || [],
        media_types: media_types || [],
        is_public: is_public !== undefined ? is_public : true,
      }])
      .select(`
        *,
        author:profiles!posts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Create notifications for friends when user posts
    try {
      const serviceSupabase = createServiceSupabaseClient();
      
      // Get all accepted friends
      const { data: friendships } = await serviceSupabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      if (friendships && friendships.length > 0) {
        // Create notification for each friend
        const notifications = friendships.map(friendship => ({
          user_id: friendship.requester_id === profile.id ? friendship.addressee_id : friendship.requester_id,
          actor_id: profile.id,
          type: 'friend_post',
          post_id: data.id,
          is_read: false,
        }));

        await serviceSupabase
          .from('notifications')
          .insert(notifications);
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
      // Don't fail the post creation if notifications fail
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post', details: error.message },
      { status: 500 }
    );
  }
}
