import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

export async function POST(request) {
  try {
    const payload = await request.json();
    const { type, data } = payload;

    console.log('Clerk webhook received:', type);

    // Handle user creation
    if (type === 'user.created') {
      const supabase = createServiceSupabaseClient();
      const clerkUserId = data.id;
      
      // Generate username from email or ID
      const email = data.email_addresses?.[0]?.email_address;
      const baseUsername = email 
        ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
        : `user${clerkUserId.slice(0, 8)}`;
      
      // Check if username exists and make it unique
      let username = baseUsername;
      let counter = 1;
      while (true) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single();
        
        if (!existing) break;
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert([{
          clerk_user_id: clerkUserId,
          username: username,
          display_name: data.first_name || data.username || username,
          avatar_url: data.image_url || '',
          bio: '',
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        throw error;
      }

      console.log('Profile created automatically:', profile);
      return NextResponse.json({ success: true, profile }, { status: 201 });
    }

    // Handle user updates
    if (type === 'user.updated') {
      const supabase = createServiceSupabaseClient();
      const clerkUserId = data.id;

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.first_name || data.username,
          avatar_url: data.image_url || '',
        })
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        console.error('Error updating profile:', error);
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Handle user deletion
    if (type === 'user.deleted') {
      const supabase = createServiceSupabaseClient();
      const clerkUserId = data.id;

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        console.error('Error deleting profile:', error);
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
