import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// DELETE /api/groups/[id]/members/[memberId] - Remove member or leave group
export async function DELETE(request, { params }) {
  try {
    const { id: groupId, memberId } = await params;
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceClient = createServiceSupabaseClient();

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a member of this group
    const { data: myParticipation, error: myParticipationError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', groupId)
      .eq('profile_id', profile.id)
      .single();

    if (myParticipationError || !myParticipation) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Check if target member exists in the group
    const { data: targetParticipation, error: targetError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', groupId)
      .eq('profile_id', memberId)
      .single();

    if (targetError || !targetParticipation) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404 }
      );
    }

    const isSelf = profile.id === memberId;
    const isAdmin = myParticipation.role === 'admin';
    const targetIsAdmin = targetParticipation.role === 'admin';

    // Check permissions
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can remove other members' },
        { status: 403 }
      );
    }

    // Get group info
    const { data: group } = await supabase
      .from('conversations')
      .select('created_by')
      .eq('id', groupId)
      .single();

    // Prevent removing the creator
    if (memberId === group?.created_by && !isSelf) {
      return NextResponse.json(
        { error: 'Cannot remove the group creator' },
        { status: 403 }
      );
    }

    // Prevent admins from removing other admins (unless it's themselves)
    if (targetIsAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Cannot remove other admins' },
        { status: 403 }
      );
    }

    // If creator is leaving, we need to handle group transfer or deletion
    if (isSelf && profile.id === group?.created_by) {
      // Count remaining admins
      const { data: admins } = await supabase
        .from('conversation_participants')
        .select('profile_id')
        .eq('conversation_id', groupId)
        .eq('role', 'admin')
        .neq('profile_id', profile.id);

      if (!admins || admins.length === 0) {
        // No other admins - promote the oldest member or delete group if empty
        const { data: members } = await supabase
          .from('conversation_participants')
          .select('profile_id, joined_at')
          .eq('conversation_id', groupId)
          .neq('profile_id', profile.id)
          .order('joined_at', { ascending: true })
          .limit(1);

        if (members && members.length > 0) {
          // Promote oldest member to admin and make them creator
          await serviceClient
            .from('conversation_participants')
            .update({ role: 'admin' })
            .eq('conversation_id', groupId)
            .eq('profile_id', members[0].profile_id);

          await serviceClient
            .from('conversations')
            .update({ created_by: members[0].profile_id })
            .eq('id', groupId);
        } else {
          // No one left - delete the group
          await serviceClient.from('messages').delete().eq('conversation_id', groupId);
          await serviceClient.from('conversation_participants').delete().eq('conversation_id', groupId);
          await serviceClient.from('conversations').delete().eq('id', groupId);
          
          return NextResponse.json({
            success: true,
            message: 'You left the group. Group was deleted as you were the last member.',
            groupDeleted: true
          }, { status: 200 });
        }
      }
    }

    // Remove the member
    const { error: removeError } = await serviceClient
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', groupId)
      .eq('profile_id', memberId);

    if (removeError) throw removeError;

    // Update group updated_at
    await serviceClient
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', groupId);

    return NextResponse.json({
      success: true,
      message: isSelf ? 'You have left the group' : 'Member removed from group'
    }, { status: 200 });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/groups/[id]/members/[memberId] - Update member role (admin only)
export async function PATCH(request, { params }) {
  try {
    const { id: groupId, memberId } = await params;
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceClient = createServiceSupabaseClient();
    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "member"' },
        { status: 400 }
      );
    }

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if current user is admin
    const { data: myParticipation, error: myParticipationError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', groupId)
      .eq('profile_id', profile.id)
      .single();

    if (myParticipationError || !myParticipation) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    if (myParticipation.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can change member roles' },
        { status: 403 }
      );
    }

    // Get group to check creator
    const { data: group } = await supabase
      .from('conversations')
      .select('created_by')
      .eq('id', groupId)
      .single();

    // Prevent demoting the creator
    if (memberId === group?.created_by && role === 'member') {
      return NextResponse.json(
        { error: 'Cannot demote the group creator' },
        { status: 403 }
      );
    }

    // Update role
    const { error: updateError } = await serviceClient
      .from('conversation_participants')
      .update({ role })
      .eq('conversation_id', groupId)
      .eq('profile_id', memberId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Member role updated to ${role}`
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update role', details: error.message },
      { status: 500 }
    );
  }
}
