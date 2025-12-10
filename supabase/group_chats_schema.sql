-- ============================================================================
-- GROUP CHATS SCHEMA
-- ============================================================================
-- Extends the existing messaging schema to support group chats
-- Run this SQL in your Supabase SQL Editor after messages_schema.sql
-- ============================================================================

-- Add group chat fields to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS group_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS group_description TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add role to conversation_participants for group admin management
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));

-- Create index for group conversations
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(is_group);
CREATE INDEX IF NOT EXISTS idx_conversations_group_name ON conversations(group_name) WHERE is_group = TRUE;

-- Function to check if user is group admin
CREATE OR REPLACE FUNCTION is_group_admin(conv_id UUID, user_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND profile_id = user_profile_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group member count
CREATE OR REPLACE FUNCTION get_group_member_count(conv_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM conversation_participants
    WHERE conversation_id = conv_id
  );
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for group chats (if needed)
-- The existing policies should work since they check conversation_participants

-- Policy to allow group admins to update group info
DROP POLICY IF EXISTS "Group admins can update group info" ON conversations;
CREATE POLICY "Group admins can update group info"
  ON conversations FOR UPDATE
  USING (
    is_group = TRUE AND
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp
      INNER JOIN profiles p ON cp.profile_id = p.id
      WHERE cp.conversation_id = conversations.id
      AND p.clerk_user_id = (auth.jwt() ->> 'sub')::text
      AND cp.role = 'admin'
    )
  );

-- Comments to document the schema changes:
-- 1. conversations.is_group: TRUE for group chats, FALSE for direct messages
-- 2. conversations.group_name: Name of the group (only for group chats)
-- 3. conversations.group_avatar_url: Group avatar/icon (only for group chats)
-- 4. conversations.group_description: Optional group description
-- 5. conversations.created_by: Profile ID of user who created the group
-- 6. conversation_participants.role: 'admin' or 'member' (admin can manage group)
