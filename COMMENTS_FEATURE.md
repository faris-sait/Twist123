# Comments Feature - Implementation Guide

## Overview
The comments feature allows users to comment on posts, reply to comments, and delete their own comments. This document outlines the implementation and setup steps.

## Database Setup

### 1. Run the Comments Schema
Execute the SQL schema to create the comments table in Supabase:

```bash
# In Supabase SQL Editor, run:
supabase/comments_schema.sql
```

This creates:
- `comments` table with columns: id, post_id, author_id, content, parent_id, created_at, updated_at
- Indexes for performance optimization
- RLS policies for security
- Trigger for automatic updated_at timestamp

### 2. Verify Table Creation
In Supabase dashboard:
1. Go to Table Editor
2. Confirm `comments` table exists
3. Check that RLS is enabled

## API Endpoints

### GET /api/posts/[id]/comments
Fetches all comments for a specific post with author information.

**Response:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "post_id": "uuid",
      "author_id": "uuid",
      "content": "Great post!",
      "parent_id": null,
      "created_at": "2025-11-09T...",
      "author": {
        "id": "uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://...",
        "is_verified": true
      }
    }
  ]
}
```

### POST /api/posts/[id]/comments
Creates a new comment on a post.

**Request Body:**
```json
{
  "content": "This is a comment",
  "parent_id": "uuid" // optional, for replies
}
```

**Response:**
```json
{
  "comment": {
    "id": "uuid",
    "post_id": "uuid",
    "author_id": "uuid",
    "content": "This is a comment",
    "parent_id": null,
    "created_at": "2025-11-09T...",
    "author": { /* author details */ }
  }
}
```

### DELETE /api/comments/[id]
Deletes a specific comment (only by the author).

**Response:**
```json
{
  "message": "Comment deleted successfully"
}
```

## Components

### CommentsList Component
Location: `components/CommentsList.jsx`

**Props:**
- `postId` (string): The ID of the post
- `commentCount` (number): Initial comment count
- `onCommentCountChange` (function): Callback when comment count changes

**Features:**
- Display all comments with author information
- Write new comments with textarea
- Reply to comments (nested replies)
- Delete own comments
- Real-time comment count updates
- Verified badge for verified users
- Relative timestamps (e.g., "2m ago", "5h ago")

**Usage:**
```jsx
<CommentsList
  postId={post.id}
  commentCount={commentCount}
  onCommentCountChange={setCommentCount}
/>
```

### PostCard Updates
Location: `components/PostCard.jsx`

**Changes:**
- Added `showComments` state to toggle comments section
- Updated `handleComment()` to toggle comments instead of showing toast
- Integrated `CommentsList` component below post content
- Comment button highlights when comments are visible

## Features

### 1. Write Comments
- Click "Comment" button on any post
- Type your comment in the textarea
- Click "Comment" button to submit
- Comment appears immediately after posting

### 2. Reply to Comments
- Click "Reply" button under any comment
- Type your reply in the textarea
- Comment shows as nested reply
- Cancel reply anytime

### 3. Delete Comments
- Click three-dot menu on your own comments
- Select "Delete"
- Comment is removed immediately
- Comment count updates automatically

### 4. View Comments
- Comments load automatically when clicking "Comment" button
- Shows comment count in button (e.g., "5 Comments")
- Nested replies appear indented
- Verified users show checkmark badge

## Security

### Row Level Security (RLS)
- **SELECT**: All users can read comments
- **INSERT**: Only authenticated users can create comments
- **UPDATE**: Users can only update their own comments
- **DELETE**: Users can only delete their own comments

### Validation
- Comment content cannot be empty
- Content is trimmed before saving
- Author verification on all mutations
- Post ID validation on creation

## UI/UX Features

1. **Avatars**: Shows user avatar with fallback initials
2. **Verified Badges**: Blue checkmark for verified users
3. **Timestamps**: Relative time format (e.g., "2m ago")
4. **Nested Replies**: Visual indentation for reply threads
5. **Real-time Updates**: Comment count updates immediately
6. **Loading States**: Shows "Loading comments..." while fetching
7. **Empty State**: Friendly message when no comments exist
8. **Toast Notifications**: Success/error messages for actions

## Testing Checklist

- [ ] Run the comments schema in Supabase
- [ ] Verify comments table exists with RLS enabled
- [ ] Restart the development server
- [ ] Click "Comment" on a post - comments section should appear
- [ ] Write a comment and submit - should appear immediately
- [ ] Click "Reply" on a comment - reply form should appear
- [ ] Submit a reply - should appear nested under comment
- [ ] Click three-dot menu on your comment - "Delete" option appears
- [ ] Delete a comment - should remove immediately
- [ ] Comment count should update correctly
- [ ] Verified badge should show for verified users
- [ ] Timestamps should show relative time

## Next Steps

1. **Run the Schema**: Execute `supabase/comments_schema.sql` in Supabase SQL Editor
2. **Restart Server**: Stop and restart your development server
3. **Test**: Create posts and try commenting, replying, and deleting
4. **Customize**: Adjust styling in CommentsList.jsx as needed

## Future Enhancements

- Edit comments functionality
- Comment likes/reactions
- Comment notifications
- Mention users with @username
- Rich text formatting
- Image attachments in comments
- Comment moderation tools
- Report inappropriate comments
- Sort comments (newest/oldest/most liked)

---

**Status**: ✅ Complete and ready to use!
