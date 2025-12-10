import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/groups - Get all group conversations for current user
export async function GET() {
  try {
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

    // Get all group conversations the user is part of
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, role')
      .eq('profile_id', profile.id);

    if (participationsError) throw participationsError;

    if (!participations || participations.length === 0) {
      return NextResponse.json({ groups: [] }, { status: 200 });
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Get group conversation details
    const { data: groups, error: groupsError } = await supabase
      .from('conversations')
      .select('id, created_at, updated_at, is_group, group_name, group_avatar_url, group_description, created_by')
      .in('id', conversationIds)
      .eq('is_group', true)
      .order('updated_at', { ascending: false });

    if (groupsError) throw groupsError;

    if (!groups || groups.length === 0) {
      return NextResponse.json({ groups: [] }, { status: 200 });
    }

    const groupIds = groups.map(g => g.id);

    // Get all participants for these groups
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        profile_id,
        role,
        profiles:profiles!conversation_participants_profile_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .in('conversation_id', groupIds);

    // Get latest messages for each group
    const { data: allMessages } = await supabase
      .from('messages')
      .select('conversation_id, encrypted_content, created_at, sender_id')
      .in('conversation_id', groupIds)
      .order('created_at', { ascending: false });

    // Group participants and messages by conversation
    const participantsByGroup = {};
    allParticipants?.forEach(p => {
      if (!participantsByGroup[p.conversation_id]) {
        participantsByGroup[p.conversation_id] = [];
      }
      participantsByGroup[p.conversation_id].push({
        ...p.profiles,
        role: p.role
      });
    });

    const messagesByGroup = {};
    allMessages?.forEach(msg => {
      if (!messagesByGroup[msg.conversation_id]) {
        messagesByGroup[msg.conversation_id] = msg;
      }
    });

    // Build final groups array
    const groupsWithDetails = groups.map(group => {
      const participation = participations.find(p => p.conversation_id === group.id);
      const participants = participantsByGroup[group.id] || [];
      const latestMessage = messagesByGroup[group.id] || null;
      
      // Count unread messages
      const unreadMessages = allMessages?.filter(m => 
        m.conversation_id === group.id &&
        m.sender_id !== profile.id && 
        new Date(m.created_at) > new Date(participation?.last_read_at || 0)
      ) || [];

      return {
        ...group,
        participants,
        memberCount: participants.length,
        myRole: participation?.role || 'member',
        latestMessage,
        unreadCount: unreadMessages.length,
      };
    });

    return NextResponse.json({ groups: groupsWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group chat
export async function POST(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceClient = createServiceSupabaseClient();
    const body = await request.json();
    const { name, description, avatarUrl, memberIds } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
      return NextResponse.json(
        { error: 'At least one member is required' },
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

    // Create the group conversation using service client
    const { data: conversation, error: conversationError } = await serviceClient
      .from('conversations')
      .insert([{
        is_group: true,
        group_name: name.trim(),
        group_description: description?.trim() || null,
        group_avatar_url: avatarUrl || null,
        created_by: profile.id
      }])
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating group:', conversationError);
      throw conversationError;
    }

    // Add creator as admin
    const participantsToInsert = [
      { conversation_id: conversation.id, profile_id: profile.id, role: 'admin' }
    ];

    // Add other members
    memberIds.forEach(memberId => {
      if (memberId !== profile.id) {
        participantsToInsert.push({
          conversation_id: conversation.id,
          profile_id: memberId,
          role: 'member'
        });
      }
    });

    const { error: participantsError } = await serviceClient
      .from('conversation_participants')
      .insert(participantsToInsert);

    if (participantsError) {
      console.error('Error adding group members:', participantsError);
      throw participantsError;
    }

    return NextResponse.json(
      { 
        groupId: conversation.id, 
        group: {
          ...conversation,
          memberCount: participantsToInsert.length,
          myRole: 'admin'
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group', details: error.message },
      { status: 500 }
    );
  }
}
