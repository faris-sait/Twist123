import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/groups/[id]/members - Get all members of a group
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

    // Get all members
    const { data: members, error: membersError } = await supabase
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
      .eq('conversation_id', groupId)
      .order('role', { ascending: true }); // admins first

    if (membersError) throw membersError;

    return NextResponse.json({
      members: members?.map(m => ({
        ...m.profiles,
        role: m.role,
        joinedAt: m.joined_at
      })) || [],
      myRole: participation.role
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group members', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/members - Add members to group (admin only)
export async function POST(request, { params }) {
  try {
    const { id: groupId } = await params;
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceClient = createServiceSupabaseClient();
    const body = await request.json();
    const { memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one member ID is required' },
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
        { error: 'Only admins can add members' },
        { status: 403 }
      );
    }

    // Check which members are already in the group
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('profile_id')
      .eq('conversation_id', groupId)
      .in('profile_id', memberIds);

    const existingIds = new Set(existingParticipants?.map(p => p.profile_id) || []);
    const newMemberIds = memberIds.filter(id => !existingIds.has(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { message: 'All selected users are already members' },
        { status: 200 }
      );
    }

    // Add new members
    const participantsToInsert = newMemberIds.map(memberId => ({
      conversation_id: groupId,
      profile_id: memberId,
      role: 'member'
    }));

    const { error: insertError } = await serviceClient
      .from('conversation_participants')
      .insert(participantsToInsert);

    if (insertError) throw insertError;

    // Update group updated_at
    await serviceClient
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', groupId);

    return NextResponse.json({
      success: true,
      addedCount: newMemberIds.length,
      message: `Added ${newMemberIds.length} member(s) to the group`
    }, { status: 200 });
  } catch (error) {
    console.error('Error adding group members:', error);
    return NextResponse.json(
      { error: 'Failed to add members', details: error.message },
      { status: 500 }
    );
  }
}
