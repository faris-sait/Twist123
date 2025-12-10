import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/groups/[id] - Get group details
export async function GET(request, { params }) {
  try {
    const { id: groupId } = await params;
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();

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
    const { data: participation, error: participationError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', groupId)
      .eq('profile_id', profile.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(`
        profile_id,
        role,
        joined_at,
        profiles:profiles!conversation_participants_profile_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('conversation_id', groupId);

    return NextResponse.json({
      group: {
        ...group,
        participants: participants?.map(p => ({
          ...p.profiles,
          role: p.role,
          joinedAt: p.joined_at
        })) || [],
        memberCount: participants?.length || 0,
        myRole: participation.role
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] - Update group details (admin only)
export async function PUT(request, { params }) {
  try {
    const { id: groupId } = await params;
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceClient = createServiceSupabaseClient();
    const body = await request.json();
    const { name, description, avatarUrl } = body;

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is admin of this group
    const { data: participation, error: participationError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', groupId)
      .eq('profile_id', profile.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      );
    }

    if (participation.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update group details' },
        { status: 403 }
      );
    }

    // Update group
    const updateData = {};
    if (name !== undefined) updateData.group_name = name.trim();
    if (description !== undefined) updateData.group_description = description?.trim() || null;
    if (avatarUrl !== undefined) updateData.group_avatar_url = avatarUrl || null;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedGroup, error: updateError } = await serviceClient
      .from('conversations')
      .update(updateData)
      .eq('id', groupId)
      .eq('is_group', true)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ group: updatedGroup }, { status: 200 });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - Delete group (admin only, must be creator)
export async function DELETE(request, { params }) {
  try {
    const { id: groupId } = await params;
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

    // Check if user is the creator of this group
    const { data: group, error: groupError } = await supabase
      .from('conversations')
      .select('created_by')
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.created_by !== profile.id) {
      return NextResponse.json(
        { error: 'Only the group creator can delete the group' },
        { status: 403 }
      );
    }

    // Delete all messages in the group first
    await serviceClient
      .from('messages')
      .delete()
      .eq('conversation_id', groupId);

    // Delete all participants
    await serviceClient
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', groupId);

    // Delete the group
    const { error: deleteError } = await serviceClient
      .from('conversations')
      .delete()
      .eq('id', groupId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group', details: error.message },
      { status: 500 }
    );
  }
}
