-- Message Replies Schema Migration
-- Adds WhatsApp-style reply functionality to messages
-- Run this SQL in your Supabase SQL Editor

-- Add reply_to_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Create index for faster reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);

-- Comment explaining the feature
COMMENT ON COLUMN messages.reply_to_id IS 'Reference to the original message being replied to (WhatsApp-style replies)';
