# Direct Messaging Setup Guide

## 🎉 Instagram-Style Direct Messaging System

Your TWIST app now has a complete direct messaging system similar to Instagram!

## Features Implemented

### ✅ Core Messaging Features
- **Conversations List**: View all your message threads with unread counts
- **Real-time Chat**: Send and receive messages instantly
- **Search Users**: Find friends to start new conversations
- **Message Thread View**: Instagram-style chat interface with bubbles
- **Unread Indicators**: Badge counts on Messages tab
- **Auto-scrolling**: Messages automatically scroll to bottom
- **Date Grouping**: Messages grouped by date with separators
- **Quick Message**: Message button on friend profiles in search

### 🎨 UI Components Created
1. **MessagesView** - Main messages interface with conversations sidebar
2. **MessageThread** - Chat thread with message bubbles
3. **NewMessageDialog** - Search and start new conversations
4. **Navigation** - Updated with Messages tab and unread badge

### 🗄️ Database Structure
- **conversations** - Stores conversation metadata
- **conversation_participants** - Links users to conversations (many-to-many)
- **messages** - Stores individual messages with content
- **RLS Policies** - Secure access control for all tables

## Setup Instructions

### 1. Run the SQL Schema
Execute the following SQL in your Supabase SQL Editor:

```bash
# Navigate to your project
cd c:\Users\FARZANA BAI\Twist123-1

# Open the schema file
supabase\messages_schema.sql
```

Copy and paste the entire contents into Supabase SQL Editor and run it.

### 2. Verify Tables Created
Check that these tables exist in your Supabase database:
- ✅ conversations
- ✅ conversation_participants  
- ✅ messages

### 3. Test the Feature
1. Sign in to your TWIST app
2. Click the **Messages** tab in navigation
3. Click the **Edit/Pencil** icon to start a new message
4. Search for a user and click to start chatting
5. Send messages back and forth!

## How It Works

### Starting a Conversation
```javascript
// User clicks Message button or searches in Messages tab
POST /api/conversations
{
  "otherUserId": "profile-id-here"
}

// Returns conversation ID (creates new or finds existing)
```

### Sending Messages
```javascript
// User types and sends a message
POST /api/conversations/{conversationId}/messages
{
  "content": "Hello there!"
}
```

### Fetching Messages
```javascript
// Automatically fetches messages every 2 seconds
GET /api/conversations/{conversationId}/messages

// Returns all messages with sender info
```

### Unread Counts
- Tracks `last_read_at` for each participant
- Shows unread badge on Messages tab
- Auto-updates when viewing conversation
- Polls every 5 seconds for new messages

## API Endpoints Created

### Conversations
- `GET /api/conversations` - List all user's conversations
- `POST /api/conversations` - Create/get conversation with user

### Messages
- `GET /api/conversations/[id]/messages` - Get conversation messages
- `POST /api/conversations/[id]/messages` - Send a message

## Security Features

### Row Level Security (RLS)
All tables have RLS policies ensuring:
- ✅ Users can only see their own conversations
- ✅ Users can only read messages in their conversations
- ✅ Users can only send messages to their conversations
- ✅ Users can only delete their own messages

### Authentication
- All endpoints use Clerk authentication
- Profile ID verification for all operations
- Prevents unauthorized access to conversations

## UI Design Highlights

### Instagram-Style Features
- **Conversations Sidebar**: List with avatars, names, latest message preview
- **Unread Badges**: Blue badges showing unread count
- **Message Bubbles**: Sent (blue) vs received (gray) styling
- **Time Labels**: Relative timestamps (2m ago, 1h ago, etc.)
- **Date Separators**: "Today", "Yesterday", etc.
- **Auto-scroll**: Always shows latest message
- **Search Dialog**: Clean modal to find users
- **Responsive**: Works on mobile and desktop

### Polling Strategy
- **Conversations List**: Refreshes every 5 seconds
- **Message Thread**: Refreshes every 2 seconds  
- **Unread Count**: Updates on navigation and message send

## Usage Tips

### For Users
1. **Start a Conversation**: Click the pencil icon in Messages tab
2. **Quick Message**: In Search Users, click "Message" button next to friends
3. **View Unread**: Red badge shows total unread messages
4. **Auto-read**: Opening a conversation marks messages as read

### For Developers
```javascript
// Get unread messages count
const response = await fetch('/api/conversations');
const data = await response.json();
const unreadCount = data.conversations?.reduce(
  (sum, conv) => sum + (conv.unreadCount || 0), 
  0
);

// Start conversation from anywhere
const handleMessageUser = async (userId) => {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otherUserId: userId }),
  });
  
  const { conversationId } = await res.json();
  // Navigate to messages tab with this conversation
};
```

## Troubleshooting

### Messages not showing?
1. Check Supabase SQL Editor - run messages_schema.sql
2. Verify RLS policies are created
3. Check browser console for errors

### Can't send messages?
1. Verify you're authenticated (Clerk)
2. Check conversation_participants table has both users
3. Ensure RLS policies allow your user

### Unread count wrong?
1. Check last_read_at timestamp in conversation_participants
2. Verify messages.created_at is after last_read_at
3. Refresh the page

## Future Enhancements

### Potential Features to Add
- 🔔 Real-time notifications (Supabase Realtime)
- 🖼️ Image/file sharing in messages
- ✏️ Edit/delete messages
- 👁️ "Typing..." indicator
- ✅ "Seen" status with checkmarks
- 🔍 Search within messages
- 🗑️ Delete conversations
- 📌 Pin important conversations
- 🎨 Message reactions/emojis
- 📱 Push notifications

## Tech Stack

- **Frontend**: React with Next.js 14 App Router
- **UI**: Shadcn/ui components
- **Auth**: Clerk authentication
- **Database**: Supabase PostgreSQL
- **Security**: Row Level Security (RLS)
- **Styling**: Tailwind CSS

---

**Your messaging system is now live! 🚀**

Users can now chat with their friends directly in TWIST, just like Instagram!
