import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { currentUser } from '@clerk/nextjs/server';

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const user = await currentUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found - auto-create one
        console.log('No profile found, creating automatically...');
        
        // Get username from Clerk
        const clerkUsername = user?.username;
        
        if (!clerkUsername) {
          return NextResponse.json(
            { error: 'Username not found in Clerk account' },
            { status: 400 }
          );
        }

        // Auto-create profile with Clerk username
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            clerk_user_id: clerkUserId,
            username: clerkUsername,
            display_name: user?.firstName || clerkUsername,
            avatar_url: user?.imageUrl || '',
            bio: '',
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error auto-creating profile:', createError);
          return NextResponse.json({ profile: null }, { status: 200 });
        }

        console.log('Profile auto-created:', newProfile);
        return NextResponse.json({ profile: newProfile }, { status: 200 });
      }
      throw error;
    }

    // Sync username from Clerk if it has changed
    if (user?.username && data.username !== user.username) {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({ username: user.username })
        .eq('clerk_user_id', clerkUserId)
        .select()
        .single();
      
      if (updatedProfile) {
        return NextResponse.json({ profile: updatedProfile }, { status: 200 });
      }
    }

    return NextResponse.json({ profile: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/profile - Create new profile
export async function POST(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const user = await currentUser();
    const supabase = await createClerkSupabaseClient();
    
    const body = await request.json();
    const { username, display_name, bio, avatar_url } = body;

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 409 }
      );
    }

    // Create profile
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        clerk_user_id: clerkUserId,
        username,
        display_name: display_name || user?.firstName || username,
        bio: bio || '',
        avatar_url: avatar_url || user?.imageUrl || '',
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request) {
  try {
    const clerkUserId = await getClerkUserId();
    const user = await currentUser();
    const supabase = await createClerkSupabaseClient();
    
    const body = await request.json();
    const { display_name, bio, avatar_url, cover_image_url, website_url, location } = body;

    // Username is NOT allowed to be updated - it comes from Clerk
    // Always use the username from Clerk
    const clerkUsername = user?.username;

    // Update profile (excluding username which is managed by Clerk)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: clerkUsername, // Always sync from Clerk
        ...(display_name !== undefined && { display_name }),
        ...(bio !== undefined && { bio }),
        ...(avatar_url !== undefined && { avatar_url }),
        ...(cover_image_url !== undefined && { cover_image_url }),
        ...(website_url !== undefined && { website_url }),
        ...(location !== undefined && { location }),
      })
      .eq('clerk_user_id', clerkUserId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}
