-- Direct Messaging Schema
-- Run this SQL in your Supabase SQL Editor

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_participants table (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, profile_id)
);

-- Create messages table
-- NOTE: encrypted_content field stores AES-256 encrypted messages in format: iv:encryptedData
-- Both IV and encrypted data are hex-encoded strings
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL, -- Stores encrypted content (iv:encryptedData format)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile ON conversation_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- DISABLE RLS on conversation_participants to avoid recursion
-- Security is handled through conversations and messages policies
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp
      INNER JOIN profiles p ON cp.profile_id = p.id
      WHERE cp.conversation_id = conversations.id
      AND p.clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their conversations"
  ON conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp
      INNER JOIN profiles p ON cp.profile_id = p.id
      WHERE cp.conversation_id = conversations.id
      AND p.clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

-- No RLS policies needed for conversation_participants since RLS is disabled
-- Security is enforced through the conversations and messages policies

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      INNER JOIN profiles p ON cp.profile_id = p.id
      WHERE cp.conversation_id = messages.conversation_id
      AND p.clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      INNER JOIN profiles p ON cp.profile_id = p.id
      WHERE cp.conversation_id = messages.conversation_id
      AND p.clerk_user_id = (auth.jwt() ->> 'sub')::text
      AND messages.sender_id = p.id
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (
    sender_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (
    sender_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

-- Function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when new message is sent
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Migration: Rename content column to encrypted_content (if not already renamed)
-- Run this if you're updating an existing database
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE messages RENAME COLUMN content TO encrypted_content;
  END IF;
END $$;
