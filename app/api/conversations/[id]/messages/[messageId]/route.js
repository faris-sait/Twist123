import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';

// DELETE /api/conversations/[id]/messages/[messageId] - Delete a message
export async function DELETE(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { id, messageId } = await params;

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify the message belongs to the user
    const { data: message } = await supabase
      .from('messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', id)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender_id !== profile.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this message' },
        { status: 403 }
      );
    }

    // Delete the message
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message', details: error.message },
      { status: 500 }
    );
  }
}
