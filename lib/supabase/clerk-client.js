import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Creates a Supabase client authenticated with Clerk's JWT token
 * This client will enforce Row Level Security (RLS) policies based on the authenticated user
 * Use this for all user-scoped operations in API routes
 */
export async function createClerkSupabaseClient() {
  try {
    const { getToken } = await auth();
    
    // Get the Supabase JWT token from Clerk (uses 'supabase' template)
    const supabaseAccessToken = await getToken({
      template: 'supabase',
    });

    if (!supabaseAccessToken) {
      console.error('Failed to get Supabase token from Clerk. Make sure you have configured the Supabase JWT template in Clerk Dashboard.');
      throw new Error('Failed to get Supabase token from Clerk. Please check Clerk configuration.');
    }

    // Create Supabase client with Clerk's JWT token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseAccessToken}`,
          },
        },
      }
    );

    return supabase;
  } catch (error) {
    console.error('Error creating Clerk Supabase client:', error);
    throw error;
  }
}

/**
 * Gets the Clerk user ID from the current session
 * Use this to link Clerk users with Supabase profiles
 */
export async function getClerkUserId() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  return userId;
}
