# TWIST Social Media Platform

A modern, production-ready social media platform built with **Next.js 14**, **Clerk Authentication**, and **Supabase PostgreSQL**.

## 🎯 Features (MVP)

- ✅ **User Authentication** - Secure signup/login via Clerk
- ✅ **User Profiles** - Create and manage profiles linked to Clerk accounts
- ✅ **Posts Feed** - Create and view posts with real-time updates
- ✅ **Row Level Security** - Database-level security via Supabase RLS
- ✅ **Beautiful UI** - Modern design with Tailwind CSS + shadcn/ui
- ✅ **Verified Badges** - Support for verified user badges
- ✅ **Responsive Design** - Works on desktop and mobile

## 🏗️ Architecture

```
Frontend (Next.js 14)
    ↓
Clerk Authentication
    ↓
API Routes (Next.js)
    ↓
Supabase PostgreSQL (RLS enabled)
```

### Key Components

- **Authentication**: Clerk handles all user auth (signup, login, sessions, JWTs)
- **Database**: Supabase PostgreSQL with Row Level Security
- **User Identity Flow**: Clerk → JWT → Supabase RLS → Data Access
- **Security**: RLS policies enforce data access at database level

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Clerk account with application created
- Supabase project created

### Setup Steps

#### 1. Install Dependencies

```bash
cd /app
yarn install
```

#### 2. Configure Environment Variables

The `.env` file is already configured with your credentials:


#### 3. Run Database Schema

1. Go to Supabase Dashboard: https://gvtatgpxlxulrppilhoe.supabase.co
2. Navigate to **SQL Editor**
3. Copy contents of `/app/supabase/schema.sql`
4. Paste and run the SQL
5. Verify: You should see `profiles` and `posts` tables created

#### 4. Configure Clerk JWT Template ⚠️ **CRITICAL**

**This is the most important step!** See detailed instructions in `/app/CLERK_JWT_SETUP.md`

Quick steps:
1. Go to Clerk Dashboard → JWT Templates
2. Create new template named `supabase`
3. Use custom signing key with your Supabase JWT Secret
4. Ensure `sub: {{user.id}}` claim is present

#### 5. Start Development Server

```bash
yarn dev
```

Visit: http://localhost:3000

## 📁 Project Structure

```
/app/
├── app/
│   ├── api/
│   │   ├── profile/
│   │   │   └── route.js          # Profile CRUD endpoints
│   │   └── posts/
│   │       ├── route.js          # Posts feed & create
│   │       └── [id]/route.js     # Single post & delete
│   ├── layout.js                 # Root layout with ClerkProvider
│   ├── page.js                   # Main app UI
│   └── globals.css               # Global styles
├── lib/
│   └── supabase/
│       ├── clerk-client.js       # Authenticated Supabase client
│       └── service-client.js     # Service role client
├── components/ui/                # shadcn/ui components
├── middleware.js                 # Clerk authentication middleware
├── supabase/
│   └── schema.sql                # Database schema
├── SETUP_GUIDE.md                # Complete setup instructions
├── CLERK_JWT_SETUP.md            # Clerk JWT configuration guide
└── README.md                     # This file
```

## 🗄️ Database Schema

### Tables

#### `profiles`
- Stores user profile information
- Linked to Clerk via `clerk_user_id`
- Fields: username, display_name, bio, avatar_url, etc.

#### `posts`
- User-generated content
- Links to profiles via `author_id`
- Fields: content, media_urls, is_public, view_count

### Row Level Security (RLS)

All tables have RLS enabled with policies:

**Profiles:**
- SELECT: All authenticated users can view
- INSERT: Users can create their own profile only
- UPDATE: Users can update their own profile only
- DELETE: Users can delete their own profile only

**Posts:**
- SELECT: Users can see public posts OR their own posts
- INSERT: Users can create posts linked to their profile
- UPDATE: Users can update their own posts
- DELETE: Users can delete their own posts

## 🔒 Security

- **No mock data** - System starts completely empty
- **RLS enforcement** - All data access controlled at database level
- **JWT-based auth** - Clerk JWTs signed with Supabase secret
- **Server-side only** - No client-side database access
- **Service role isolation** - Admin operations separated from user operations

## 🎨 UI Components

Built with:
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality React components
- **Lucide Icons** - Beautiful icons
- **Responsive Design** - Mobile-first approach

## 🧪 Testing

### Test Profile Creation

```bash
# After signing up, create profile via UI
# Or test API directly:
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "display_name": "Test User", "bio": "Hello!"}'
```

### Test Post Creation

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"content": "My first post!", "is_public": true}'
```

### Verify in Supabase

Go to Supabase Dashboard → Table Editor:
- Check `profiles` table for your profile
- Check `posts` table for your posts

## 🐛 Troubleshooting

### "Failed to get Supabase token from Clerk"
- **Fix**: Configure Clerk JWT template (see CLERK_JWT_SETUP.md)

### "RLS policy violation"
- **Fix**: Ensure JWT template has correct claims and signing key

### "Profile not found"
- **Fix**: Create profile via the UI after signing up

### "No posts showing"
- **Fix**: Create a post - feed starts empty

## 📚 Documentation

- **Setup Guide**: `/app/SETUP_GUIDE.md` - Complete setup instructions
- **Clerk JWT Setup**: `/app/CLERK_JWT_SETUP.md` - Critical JWT configuration
- **SQL Schema**: `/app/supabase/schema.sql` - Database schema with comments

## 🔄 Development Workflow

1. **Make code changes** - Edit files in `/app/app/`
2. **Hot reload** - Changes reflect automatically
3. **Check logs** - `tail -f /var/log/supervisor/nextjs.out.log`
4. **Test API** - Use browser DevTools or curl
5. **Verify data** - Check Supabase Table Editor

## 🚢 Deployment

The application is configured for deployment with:
- Environment variables in `.env`
- Production build: `yarn build`
- Start production: `yarn start`

## 🎯 Next Steps (Future Features)

- [ ] Comments on posts
- [ ] Like/unlike posts
- [ ] Follow/unfollow users
- [ ] Direct messaging
- [ ] Stories (ephemeral content)
- [ ] Media uploads (Supabase Storage)
- [ ] Notifications
- [ ] Search functionality
- [ ] Profile editing UI

## 🤝 Contributing

This is a production-ready MVP foundation. Extend it by:
1. Adding more tables from the schema
2. Implementing additional features
3. Enhancing UI/UX
4. Adding real-time subscriptions

## 📄 License

Private project - All rights reserved

---

**Built with ❤️ using Next.js, Clerk, and Supabase**

For questions or issues, refer to:
- `/app/SETUP_GUIDE.md` for setup help
- `/app/CLERK_JWT_SETUP.md` for Clerk configuration
- Supabase docs: https://supabase.com/docs
- Clerk docs: https://clerk.com/docs
