import { NextResponse } from 'next/server';
import { createClerkSupabaseClient } from '@/lib/supabase/clerk-client';

// GET /api/users/[id]/posts - Get all public posts from a specific user
export async function GET(request, { params }) {
  try {
    const supabase = await createClerkSupabaseClient();
    const { id } = await params;

    const { data: posts, error } = await supabase
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
      .eq('author_id', id)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts: posts || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/users/[id]/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
