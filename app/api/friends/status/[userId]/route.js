import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';

// GET /api/friends/status/[userId] - Check friendship status with a specific user
export async function GET(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { userId } = await params;

    // Get current user's profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // userId parameter is the target user's profile ID (not clerk_user_id)
    const targetUserId = userId;

    console.log('Checking friendship between:', currentProfile.id, 'and', targetUserId);

    // Check if they are friends (using requester_id and addressee_id)
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${currentProfile.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentProfile.id})`)
      .eq('status', 'accepted')
      .maybeSingle();

    console.log('Friendship query result:', friendship, friendshipError);

    if (friendship) {
      // Get friend count for the target user
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${targetUserId},addressee_id.eq.${targetUserId}`);

      console.log('Returning friends status with count:', count);
      
      return NextResponse.json({ 
        status: 'friends',
        friendsCount: count || 0
      }, { status: 200 });
    }

    console.log('No accepted friendship found, checking for pending...');

    // Check if there's a pending request (using requester_id and addressee_id)
    const { data: pendingRequest } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${currentProfile.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${currentProfile.id})`)
      .eq('status', 'pending')
      .maybeSingle();

    console.log('Pending request result:', pendingRequest);

    if (pendingRequest) {
      if (pendingRequest.requester_id === currentProfile.id) {
        return NextResponse.json({ status: 'pending_sent' }, { status: 200 });
      } else {
        return NextResponse.json({ status: 'pending_received' }, { status: 200 });
      }
    }

    return NextResponse.json({ status: 'none' }, { status: 200 });
  } catch (error) {
    console.error('Error checking friendship status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
