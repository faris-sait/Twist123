import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/posts/[id] - Get single post (public access)
export async function GET(request, { params }) {
  try {
    // Use service client for public access (no auth required)
    const supabase = createServiceSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('id', id)
      .eq('is_public', true)  // Only allow public posts to be viewed
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ post: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id] - Delete post (only if user owns it)
export async function DELETE(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { id } = await params;

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Delete post (RLS will ensure user owns it)
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('author_id', profile.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Post deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post', details: error.message },
      { status: 500 }
    );
  }
}
