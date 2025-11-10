import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/conversations - Get all conversations for current user
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

    // Get all conversations the user is part of
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('profile_id', profile.id);

    if (participationsError) throw participationsError;

    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] }, { status: 200 });
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Get conversation details - simplified query
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, created_at, updated_at')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false })
      .limit(50); // Limit to 50 most recent conversations

    if (conversationsError) throw conversationsError;

    // Batch fetch all participants and messages for better performance
    const [allParticipants, allMessages] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          profile_id,
          profiles:profiles!conversation_participants_profile_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .in('conversation_id', conversationIds)
        .neq('profile_id', profile.id),
      
      supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
    ]);

    // Group messages by conversation and get latest + unread count
    const messagesByConversation = {};
    allMessages.data?.forEach(msg => {
      if (!messagesByConversation[msg.conversation_id]) {
        messagesByConversation[msg.conversation_id] = [];
      }
      messagesByConversation[msg.conversation_id].push(msg);
    });

    // Group participants by conversation
    const participantsByConversation = {};
    allParticipants.data?.forEach(p => {
      participantsByConversation[p.conversation_id] = p.profiles;
    });

    // Build final conversations array
    const conversationsWithDetails = conversations.map(conversation => {
      const participation = participations.find(p => p.conversation_id === conversation.id);
      const messages = messagesByConversation[conversation.id] || [];
      const latestMessage = messages[0] || null;
      
      // Count unread messages
      const unreadCount = messages.filter(m => 
        m.sender_id !== profile.id && 
        new Date(m.created_at) > new Date(participation?.last_read_at || 0)
      ).length;

      return {
        ...conversation,
        otherParticipant: participantsByConversation[conversation.id],
        latestMessage,
        unreadCount,
      };
    });

    return NextResponse.json({ conversations: conversationsWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create or get existing conversation with a user
export async function POST(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const body = await request.json();
    const { otherUserId } = body; // This is a profile ID

    console.log('POST /api/conversations - Creating conversation');
    console.log('Current user Clerk ID:', clerkUserId);
    console.log('Other user ID:', otherUserId);

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Other user ID is required' },
        { status: 400 }
      );
    }

    // Get current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    console.log('Current user profile:', profile);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if conversation already exists between these two users
    const { data: existingParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    console.log('Existing participations:', existingParticipations);

    if (existingParticipations && existingParticipations.length > 0) {
      // Check if any of these conversations also includes the other user
      for (const participation of existingParticipations) {
        const { data: otherParticipation } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', participation.conversation_id)
          .eq('profile_id', otherUserId)
          .single();

        if (otherParticipation) {
          // Conversation already exists
          console.log('Found existing conversation:', participation.conversation_id);
          return NextResponse.json(
            { conversationId: participation.conversation_id, isNew: false },
            { status: 200 }
          );
        }
      }
    }

    console.log('Creating new conversation...');

    // Use service client to bypass RLS for system operations
    const serviceClient = createServiceSupabaseClient();

    // Create new conversation
    const { data: conversation, error: conversationError } = await serviceClient
      .from('conversations')
      .insert([{}])
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      throw conversationError;
    }

    console.log('Created conversation:', conversation);

    // Add both participants using service client
    const { error: participantsError } = await serviceClient
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, profile_id: profile.id },
        { conversation_id: conversation.id, profile_id: otherUserId },
      ]);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      throw participantsError;
    }

    console.log('Successfully created conversation with ID:', conversation.id);

    return NextResponse.json(
      { conversationId: conversation.id, isNew: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error.message },
      { status: 500 }
    );
  }
}
