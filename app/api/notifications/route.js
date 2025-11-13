import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL, invalidateCache } from '@/lib/redis/client';

// GET /api/notifications - Get user's notifications
export async function GET(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch notifications with Redis caching
    const notifications = await getCachedOrFetch(
      CACHE_KEYS.notifications(profile.id, unreadOnly),
      CACHE_TTL.NOTIFICATIONS,
      async () => {
        let query = supabase
          .from('notifications')
          .select(`
            *,
            actor:profiles!notifications_actor_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            ),
            post:posts (
              id,
              content
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (unreadOnly) {
          query = query.eq('is_read', false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
    );

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Mark all notifications as read
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    // Invalidate notifications cache
    await invalidateCache(`notifications:${profile.id}:*`);

    return NextResponse.json({ message: 'All notifications marked as read' }, { status: 200 });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications', details: error.message },
      { status: 500 }
    );
  }
}
