import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { encrypt, decrypt } from '@/lib/encryption';

// GET /api/conversations/[id]/messages - Get all messages in a conversation
export async function GET(request, { params }) {
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
        { error: 'Not authorized to view this conversation' },
        { status: 403 }
      );
    }

    // Get all messages with sender info (without self-referential join for replies)
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        encrypted_content,
        image_url,
        created_at,
        is_read,
        sender_id,
        reply_to_id,
        sender:profiles!messages_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Create a map of messages for quick lookup of reply_to data
    const messageMap = new Map();
    messages?.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Mark all unread messages from other users as read
    const unreadMessageIds = messages
      ?.filter(msg => !msg.is_read && msg.sender_id !== profile.id)
      .map(msg => msg.id) || [];

    if (unreadMessageIds.length > 0) {
      console.log(`Marking ${unreadMessageIds.length} messages as read for user ${profile.id}`);
      const { data: updateData, error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessageIds)
        .select();
      
      if (updateError) {
        console.error('Error updating read status:', updateError);
      } else {
        console.log('Successfully marked messages as read:', updateData);
      }
    }

    // Decrypt all messages and update is_read status in response
    const decryptedMessages = messages?.map(msg => {
      const wasMarkedRead = unreadMessageIds.includes(msg.id);
      
      // Look up the reply_to message from our map
      let replyToData = null;
      if (msg.reply_to_id && messageMap.has(msg.reply_to_id)) {
        const replyMsg = messageMap.get(msg.reply_to_id);
        replyToData = {
          id: replyMsg.id,
          content: decrypt(replyMsg.encrypted_content),
          image_url: replyMsg.image_url,
          sender_id: replyMsg.sender_id,
          sender: replyMsg.sender
        };
      }
      
      return {
        ...msg,
        content: decrypt(msg.encrypted_content),
        encrypted_content: undefined,
        is_read: wasMarkedRead ? true : msg.is_read,
        reply_to: replyToData
      };
    }) || [];

    // Update last_read_at for this user
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .eq('profile_id', profile.id);

    return NextResponse.json({ messages: decryptedMessages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Send a message in a conversation
export async function POST(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { content, image_url, reply_to_id } = body;

    if ((!content || !content.trim()) && !image_url) {
      return NextResponse.json(
        { error: 'Message content or image is required' },
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

    // Verify user is part of this conversation
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', id)
      .eq('profile_id', profile.id)
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: 'Not authorized to send messages in this conversation' },
        { status: 403 }
      );
    }

    // Encrypt the message content before storing (if content exists)
    const encryptedContent = content && content.trim() ? encrypt(content.trim()) : encrypt('📷 Image');

    // Create message with encrypted content, optional image, and optional reply reference
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: id,
        sender_id: profile.id,
        encrypted_content: encryptedContent,
        image_url: image_url || null,
        reply_to_id: reply_to_id || null,
      }])
      .select(`
        id,
        encrypted_content,
        image_url,
        created_at,
        is_read,
        sender_id,
        reply_to_id,
        sender:profiles!messages_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Fetch reply_to message data separately if reply_to_id exists
    let replyToData = null;
    if (reply_to_id) {
      const { data: replyMsg } = await supabase
        .from('messages')
        .select(`
          id,
          encrypted_content,
          image_url,
          sender_id,
          sender:profiles!messages_sender_id_fkey (
            id,
            username,
            display_name
          )
        `)
        .eq('id', reply_to_id)
        .single();
      
      if (replyMsg) {
        replyToData = {
          id: replyMsg.id,
          content: decrypt(replyMsg.encrypted_content),
          image_url: replyMsg.image_url,
          sender_id: replyMsg.sender_id,
          sender: replyMsg.sender
        };
      }
    }

    // Decrypt the message before returning to client
    const decryptedMessage = {
      ...message,
      content: decrypt(message.encrypted_content),
      encrypted_content: undefined,
      reply_to: replyToData
    };

    return NextResponse.json({ message: decryptedMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
