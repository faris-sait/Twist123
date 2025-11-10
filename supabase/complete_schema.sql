-- ============================================================================
-- TWIST SOCIAL MEDIA PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This file combines all schemas: profiles, posts, friendships, and comments
-- Run this entire file in Supabase SQL Editor to set up the complete database
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- PHASE 1: CORE TABLES (Profiles & Posts)
-- ============================================================================

-- TABLE: profiles
-- Purpose: Store user profile information linked to Clerk accounts
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL, -- Links to Clerk user ID (this is the bridge)
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  website_url TEXT,
  location TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- TABLE: posts
-- Purpose: User-generated content posts with text and media
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_types TEXT[] DEFAULT '{}',
  location TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_public ON posts(is_public);

-- ============================================================================
-- PHASE 2: FRIENDSHIPS TABLE
-- ============================================================================

-- TABLE: friendships
-- Purpose: Track friend requests and connections between users
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique friendship (no duplicates)
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id),
  -- Prevent self-friendship
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

-- Indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON friendships(created_at DESC);

-- ============================================================================
-- PHASE 3: COMMENTS TABLE
-- ============================================================================

-- TABLE: comments
-- Purpose: Store comments on posts with support for nested replies
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- ============================================================================
-- PHASE 4: NOTIFICATIONS TABLE
-- ============================================================================

-- TABLE: notifications
-- Purpose: Store user notifications for various activities
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'friend_post', 'comment', 'like')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to friendships
DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - ENABLE ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: PROFILES
-- ============================================================================

-- SELECT: All authenticated users can view all profiles (public directory)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: Users can only insert a profile where clerk_user_id matches their JWT sub claim
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- UPDATE: Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    auth.jwt() ->> 'sub' = clerk_user_id
  )
  WITH CHECK (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- DELETE: Users can only delete their own profile
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE
  USING (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- ============================================================================
-- RLS POLICIES: POSTS
-- ============================================================================

-- SELECT: Users can see all public posts OR their own posts regardless of visibility
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
CREATE POLICY "posts_select_policy" ON posts
  FOR SELECT
  USING (
    is_public = TRUE
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- INSERT: Users can only create posts where author_id references their own profile
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
CREATE POLICY "posts_insert_policy" ON posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- UPDATE: Users can only update their own posts
DROP POLICY IF EXISTS "posts_update_policy" ON posts;
CREATE POLICY "posts_update_policy" ON posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- DELETE: Users can only delete their own posts
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
CREATE POLICY "posts_delete_policy" ON posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ============================================================================
-- RLS POLICIES: FRIENDSHIPS
-- ============================================================================

-- SELECT: Users can see friendships where they are either requester or addressee
DROP POLICY IF EXISTS "friendships_select_policy" ON friendships;
CREATE POLICY "friendships_select_policy" ON friendships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
      AND (profiles.id = friendships.requester_id OR profiles.id = friendships.addressee_id)
    )
  );

-- INSERT: Users can create friend requests where they are the requester
DROP POLICY IF EXISTS "friendships_insert_policy" ON friendships;
CREATE POLICY "friendships_insert_policy" ON friendships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = requester_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- UPDATE: Users can update friendships where they are the addressee (accept/reject)
DROP POLICY IF EXISTS "friendships_update_policy" ON friendships;
CREATE POLICY "friendships_update_policy" ON friendships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = addressee_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = addressee_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- DELETE: Users can delete friendships where they are either requester or addressee
DROP POLICY IF EXISTS "friendships_delete_policy" ON friendships;
CREATE POLICY "friendships_delete_policy" ON friendships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
      AND (profiles.id = friendships.requester_id OR profiles.id = friendships.addressee_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: COMMENTS
-- ============================================================================

-- SELECT: Everyone can read comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- INSERT: Authenticated users can create comments
DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- UPDATE: Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = comments.author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- DELETE: Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = comments.author_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ============================================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================================

-- SELECT: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = notifications.user_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- INSERT: System can create notifications (handled by service client)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- UPDATE: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = notifications.user_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- DELETE: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = notifications.user_id
      AND profiles.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: Posts with author information
CREATE OR REPLACE VIEW posts_with_details AS
SELECT 
  p.*,
  prof.username,
  prof.display_name,
  prof.avatar_url,
  prof.is_verified
FROM posts p
JOIN profiles prof ON p.author_id = prof.id;

-- View: User's friends (accepted friendships)
CREATE OR REPLACE VIEW user_friends AS
SELECT 
  f.id as friendship_id,
  f.requester_id,
  f.addressee_id,
  f.created_at as friends_since,
  CASE 
    WHEN f.requester_id = p1.id THEN p2.id
    ELSE p1.id
  END as friend_id,
  CASE 
    WHEN f.requester_id = p1.id THEN p2.username
    ELSE p1.username
  END as friend_username,
  CASE 
    WHEN f.requester_id = p1.id THEN p2.display_name
    ELSE p1.display_name
  END as friend_display_name,
  CASE 
    WHEN f.requester_id = p1.id THEN p2.avatar_url
    ELSE p1.avatar_url
  END as friend_avatar_url,
  CASE 
    WHEN f.requester_id = p1.id THEN p2.is_verified
    ELSE p1.is_verified
  END as friend_is_verified
FROM friendships f
JOIN profiles p1 ON f.requester_id = p1.id
JOIN profiles p2 ON f.addressee_id = p2.id
WHERE f.status = 'accepted';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('profiles', 'posts', 'friendships', 'comments', 'notifications')
ORDER BY table_name;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- All tables, indexes, triggers, RLS policies, and views have been created.
-- Your TWIST social media platform database is ready to use!
-- ============================================================================
