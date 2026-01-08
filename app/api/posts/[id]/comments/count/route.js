import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service-client';

// GET /api/posts/[id]/comments/count - Get comment count for a post (public)
export async function GET(request, { params }) {
  try {
    const supabase = createServiceSupabaseClient();
    const { id } = await params;

    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ count: count || 0 }, { status: 200 });
  } catch (error) {
    console.error('Error fetching comment count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment count', details: error.message },
      { status: 500 }
    );
  }
}
