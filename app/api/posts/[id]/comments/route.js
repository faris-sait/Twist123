import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/posts/[id]/comments - Get all comments for a post
export async function GET(request, { params }) {
  try {
    const supabase = await createClerkSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ comments: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/posts/[id]/comments - Create a new comment
export async function POST(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { content, parent_id } = body;

    console.log('=== Creating comment ===');
    console.log('Post ID:', id);
    console.log('Content:', content);

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create comment
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        post_id: id,
        author_id: profile.id,
        content: content.trim(),
        parent_id: parent_id || null,
      }])
      .select(`
        *,
        author:profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Get post author to create notification
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single();

    console.log('Post author:', post?.author_id, 'Commenter:', profile.id);

    if (!postError && post && post.author_id !== profile.id) {
      // Don't notify if user comments on their own post
      // Create notification using service client (bypasses RLS)
      console.log('Creating comment notification...');
      const { error: notifError } = await serviceSupabase
        .from('notifications')
        .insert([{
          user_id: post.author_id,
          type: 'comment',
          actor_id: profile.id,
          post_id: id,
          comment_id: data.id,
        }]);
      
      if (notifError) {
        console.error('Notification creation error:', notifError);
      } else {
        console.log('Comment notification created successfully');
      }
    } else {
      console.log('Not creating notification:', { postError, sameAuthor: post?.author_id === profile.id });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment', details: error.message },
      { status: 500 }
    );
  }
}
