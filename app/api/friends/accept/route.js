import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// POST /api/friends/accept - Accept friend request
export async function POST(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceClient = createServiceSupabaseClient();
    const body = await request.json();
    const { friendship_id } = body;

    if (!friendship_id) {
      return NextResponse.json(
        { error: 'friendship_id is required' },
        { status: 400 }
      );
    }

    // Get current user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the friendship details before updating
    const { data: friendship } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('id', friendship_id)
      .single();

    // Update friendship status to accepted
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendship_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create notification for the requester (person who sent the original request)
    // The accepter is the current user (profile.id), so notify the requester
    if (friendship) {
      try {
        await serviceClient
          .from('notifications')
          .insert([{
            user_id: friendship.requester_id,
            actor_id: profile.id,
            type: 'friend_accepted',
            is_read: false,
          }]);
      } catch (notifError) {
        console.error('Error creating friend accepted notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ friendship: data }, { status: 200 });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return NextResponse.json(
      { error: 'Failed to accept friend request', details: error.message },
      { status: 500 }
    );
  }
}
