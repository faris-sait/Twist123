import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { id } = await params;

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user is part of this conversation
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', id)
      .eq('profile_id', profile.id)
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: 'Not authorized to delete this conversation' },
        { status: 403 }
      );
    }

    // Delete the conversation (CASCADE will delete messages and participants)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: error.message },
      { status: 500 }
    );
  }
}
