import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { redis, CACHE_KEYS, CACHE_TTL, getCachedOrFetch } from '@/lib/redis/client';

// GET /api/users/search?q=username - Search for users
export async function GET(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 1) {
      return NextResponse.json(
        { error: 'Search query must be at least 1 character' },
        { status: 400 }
      );
    }

    // Get current user's profile ID
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    // Create cache key including current user ID to personalize results
    const cacheKey = `${CACHE_KEYS.userSearch(query)}:${currentProfile?.id}`;

    // Get cached results or fetch fresh data
    const users = await getCachedOrFetch(
      cacheKey,
      CACHE_TTL.USER_SEARCH,
      async () => {
        // Search for users by username or display_name
        const { data: users, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, is_verified')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .neq('id', currentProfile?.id || '') // Exclude current user
          .limit(10);

        if (error) {
          throw error;
        }

        // For each user, check friendship status
        const usersWithFriendshipStatus = await Promise.all(
          (users || []).map(async (user) => {
            const { data: friendship } = await supabase
              .from('friendships')
              .select('id, status, requester_id, addressee_id')
              .or(
                `and(requester_id.eq.${currentProfile?.id},addressee_id.eq.${user.id}),` +
                `and(requester_id.eq.${user.id},addressee_id.eq.${currentProfile?.id})`
              )
              .maybeSingle();

            let friendshipStatus = 'none';
            let friendshipId = null;
            let isRequester = false;

            if (friendship) {
              friendshipStatus = friendship.status;
              friendshipId = friendship.id;
              isRequester = friendship.requester_id === currentProfile?.id;
            }

            // Get friend count for this user
            const { count: friendsCount } = await supabase
              .from('friendships')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'accepted')
              .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

            return {
              ...user,
              friendship_status: friendshipStatus,
              friendship_id: friendshipId,
              is_requester: isRequester,
              friends_count: friendsCount || 0,
            };
          })
        );

        return usersWithFriendshipStatus;
      }
    );

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users', details: error.message },
      { status: 500 }
    );
  }
}
