# ⚠️ CRITICAL NEXT STEPS - DO THIS NOW!

## 🎯 What You Need to Do (In Order)

The application code is **100% complete** and the server is **running**. However, you need to configure two external services to make everything work.

---

## Step 1: Run Database Schema in Supabase (5 minutes)

### Instructions:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: 

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy and Run Schema**
   - Open file: `/app/supabase/schema.sql`
   - Copy **ALL** the contents (it's a long file)
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Go to **Table Editor** in left sidebar
   - You should see two tables:
     - ✅ `profiles`
     - ✅ `posts`

### What This Does:
- Creates `profiles` table (stores user info linked to Clerk)
- Creates `posts` table (stores user posts)
- Sets up Row Level Security (RLS) policies
- Creates indexes for performance
- Sets up auto-update triggers

---

## Step 2: Configure Clerk JWT Template (10 minutes) ⚠️ MOST CRITICAL

### Why This is Critical:
Without this, the app **WILL NOT WORK**. This creates the authentication bridge between Clerk and Supabase.

### Instructions:

1. **Open Clerk Dashboard**
   - Go to: https://dashboard.clerk.com
   - Select your application: **grateful-glowworm-5**

2. **Create JWT Template**
   - In left sidebar: Click **Configure** → **JWT Templates**
   - Click **+ New Template**
   - Select **Supabase** from the list

3. **Configure Template**
   
   **a) Template Name:**
   ```
   supabase
   ```
   ⚠️ Must be exactly `supabase` (lowercase, no spaces)

   **b) Claims (should auto-fill):**
   Verify these are present:
   ```json
   {
     "aud": "authenticated",
     "exp": {{token.exp}},
     "iat": {{token.iat}},
     "iss": "https://gvtatgpxlxulrppilhoe.supabase.co/auth/v1",
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address}}",
     "role": "authenticated"
   }
   ```

   **c) Signing Key (CRITICAL):**
   - Scroll down to **Signing Key** section
   - Select: **Use custom signing key**
   - Algorithm: **HS256**
   - Signing Key: Paste this:
   ```
 
   ```

4. **Save Template**
   - Click **Apply Changes** or **Save**
   - Verify it appears in your JWT Templates list

### What This Does:
- Tells Clerk to generate Supabase-compatible JWT tokens
- Signs tokens with your Supabase secret (so Supabase trusts them)
- Includes Clerk user ID in the token (for RLS policies)

---

## Step 3: Test the Application (5 minutes)

### Test Flow:

1. **Open the App**
   - Your app URL: https://twist-social-backend.preview.emergentagent.com
   - You should see a beautiful landing page

2. **Sign Up**
   - Click **Create Account**
   - Sign up with email or Google
   - Complete Clerk's signup flow

3. **Create Profile**
   - After signup, you'll see "Create Your Profile"
   - Enter:
     - Username (required): e.g., `johndoe`
     - Display Name (optional): e.g., `John Doe`
     - Bio (optional): e.g., `Hello, I'm John!`
   - Click **Create Profile**

4. **Create a Post**
   - You'll see the main feed
   - In the "Create a Post" box, type something
   - Click **Post**
   - Your post should appear in the feed below!

5. **Verify in Supabase**
   - Go back to Supabase → Table Editor
   - Click `profiles` table:
     - You should see your profile with your username
     - Note the `clerk_user_id` field matches your Clerk ID
   - Click `posts` table:
     - You should see your post
     - Note the `author_id` links to your profile

### Success Criteria:
✅ Can sign up/login via Clerk
✅ Can create profile
✅ Can create posts
✅ Can see posts in feed
✅ Data appears in Supabase tables

---

## 🐛 Troubleshooting

### Error: "Failed to get Supabase token from Clerk"

**Problem:** Clerk JWT template not configured correctly

**Solution:**
1. Check template name is exactly `supabase` (lowercase)
2. Verify signing key is pasted correctly (no extra spaces)
3. Ensure algorithm is HS256
4. Refresh the page after saving template

### Error: "Failed to create profile"

**Problem:** JWT claims not correct or RLS policy blocking

**Solution:**
1. Verify JWT template has `sub: {{user.id}}` claim
2. Verify JWT template has `role: authenticated` claim
3. Check signing key matches exactly
4. Try signing out and back in to get fresh token

### No posts showing

**Problem:** Database is empty (this is expected!)

**Solution:**
- The system starts with no data (no mock data)
- Create your first post to see it in the feed

### Can't run SQL schema

**Problem:** Supabase SQL Editor issues

**Solution:**
1. Make sure you're in the correct project
2. Try breaking the schema into smaller chunks
3. Check for any SQL syntax errors in the output

---

## 📊 What's Been Built

### ✅ Complete Features:

1. **Authentication System**
   - Clerk integration with middleware
   - Protected routes
   - User sessions

2. **Database Schema**
   - Profiles table with full RLS
   - Posts table with full RLS
   - Indexes and triggers
   - Security policies

3. **API Endpoints**
   - `POST /api/profile` - Create profile
   - `GET /api/profile` - Get current user profile
   - `PATCH /api/profile` - Update profile
   - `POST /api/posts` - Create post
   - `GET /api/posts` - Get posts feed
   - `GET /api/posts/[id]` - Get single post
   - `DELETE /api/posts/[id]` - Delete post

4. **Frontend UI**
   - Landing page with auth
   - Profile creation form
   - Posts feed
   - Post creation interface
   - User profile display
   - Beautiful responsive design

### 🎨 Tech Stack:
- Next.js 14 (App Router)
- Clerk Authentication
- Supabase PostgreSQL
- Tailwind CSS
- shadcn/ui components
- Row Level Security

---

## 📚 Additional Resources

- **Full Setup Guide**: `/app/SETUP_GUIDE.md`
- **Clerk JWT Details**: `/app/CLERK_JWT_SETUP.md`
- **Project README**: `/app/README.md`
- **SQL Schema**: `/app/supabase/schema.sql`

---

## 🎯 After Setup Works

Once everything is working, you can:

1. **Test Multiple Users**
   - Sign up with different accounts
   - Verify each user can only see/edit their own data

2. **Add More Features**
   - The schema includes tables for:
     - Comments
     - Likes
     - Stories
     - Direct Messages
     - Notifications
   - Run the full schema to add these tables

3. **Customize**
   - Edit UI in `/app/app/page.js`
   - Modify API routes in `/app/app/api/`
   - Adjust database schema

---

## ⏱️ Estimated Time

- Step 1 (Database): **5 minutes**
- Step 2 (Clerk JWT): **10 minutes**
- Step 3 (Testing): **5 minutes**

**Total: ~20 minutes**

---

## ✅ Checklist

Before testing:
- [ ] Ran SQL schema in Supabase
- [ ] Verified tables created (profiles, posts)
- [ ] Created Clerk JWT template named `supabase`
- [ ] Added custom signing key (Supabase JWT secret)
- [ ] Saved template in Clerk

Ready to test:
- [ ] Can access the app URL
- [ ] Can sign up with new account
- [ ] Can create profile
- [ ] Can create post
- [ ] Can see post in feed
- [ ] Can verify data in Supabase

---

**🚀 Let's get started! Follow Step 1 now.**
