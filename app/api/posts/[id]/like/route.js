import { NextResponse } from 'next/server';
import { createClerkSupabaseClient, getClerkUserId } from '@/lib/supabase/clerk-client';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// POST /api/posts/[id]/like - Toggle like on a post
export async function POST(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();
    const { id: postId } = await params;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError, 'Clerk user ID:', clerkUserId);
      return NextResponse.json({ error: 'Profile not found', details: profileError?.message }, { status: 404 });
    }

    console.log('Profile found:', profile.id);

    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let isLiked = false;

    if (existingLike) {
      // Unlike - delete the like
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        throw deleteError;
      }

      isLiked = false;
    } else {
      // Like - create new like
      console.log('Inserting like:', { post_id: postId, user_id: profile.id });
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert([{
          post_id: postId,
          user_id: profile.id,
        }]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      isLiked = true;

      // Get post author to create notification
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .single();

      if (!postError && post && post.author_id !== profile.id) {
        // Don't notify if user likes their own post
        // Create notification using service client (bypasses RLS)
        await serviceSupabase
          .from('notifications')
          .insert([{
            user_id: post.author_id,
            type: 'like',
            actor_id: profile.id,
            post_id: postId,
          }]);
      }
    }

    // Get updated like count
    const { count, error: countError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      isLiked,
      likeCount: count || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/posts/[id]/like - Get like status for current user and total count
export async function GET(request, { params }) {
  try {
    const clerkUserId = await getClerkUserId();
    const supabase = await createClerkSupabaseClient();
    const { id: postId } = await params;

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user liked this post
    const { data: userLike, error: likeError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (likeError) {
      throw likeError;
    }

    // Get total like count
    const { count, error: countError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      isLiked: !!userLike,
      likeCount: count || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching like status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch like status', details: error.message },
      { status: 500 }
    );
  }
}
