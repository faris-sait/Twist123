# 🔑 Clerk JWT Template Setup (CRITICAL STEP)

## ⚠️ WITHOUT THIS, THE APP WILL NOT WORK!

This is the **most critical step** - it creates the bridge between Clerk and Supabase.

## Step-by-Step Instructions

### 1. Access Clerk Dashboard
- Go to: https://dashboard.clerk.com
- Select your application: **grateful-glowworm-5**

### 2. Navigate to JWT Templates
- In the left sidebar, click **Configure** → **JWT Templates**
- Click **+ New Template**
- Select **Supabase** from the template options

### 3. Configure Template Name
```
Template Name: supabase
```
**Important:** Must be exactly `supabase` (lowercase) - this is hardcoded in `/app/lib/supabase/clerk-client.js`

### 4. Configure Claims
Ensure these claims are present (should be auto-filled by Supabase template):

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

**Critical Claims:**
- `sub`: Contains Clerk user ID - used to link with `clerk_user_id` in profiles table
- `role`: Set to "authenticated" - required for RLS policies
- `aud`: Set to "authenticated" - Supabase audience

### 5. Configure Signing Key (MOST IMPORTANT)
- Scroll down to **Signing Key** section
- Select: **Custom signing key**
- Algorithm: **HS256**
- Paste your Supabase JWT Secret:

```

```

⚠️ **This secret comes from Supabase Dashboard → Settings → API → JWT Secret**

### 6. Save Template
- Click **Apply Changes** or **Save**
- Verify the template appears in your JWT Templates list

## How to Verify It's Working

### Method 1: Check API Response
1. Sign up for a new account
2. Open browser DevTools → Network tab
3. Look for the request to `/api/profile`
4. If you see a proper response (not "Failed to get Supabase token"), it's working!

### Method 2: Check Clerk Token
1. After signing in, open browser console
2. Run: `await window.Clerk.session.getToken({template: 'supabase'})`
3. If you get a JWT token string, it's configured correctly!
4. Decode the JWT at https://jwt.io to verify claims

## Common Issues

### Error: "Failed to get Supabase token from Clerk"
**Cause:** JWT template not found or named incorrectly
**Fix:** Ensure template is named exactly `supabase` (lowercase)

### Error: "JWT verification failed"
**Cause:** Wrong signing key or algorithm
**Fix:** 
- Verify you're using the correct SUPABASE_JWT_SECRET
- Ensure algorithm is HS256
- Check there are no extra spaces in the secret

### Error: "No rows returned" when creating profile
**Cause:** RLS policies blocking insert because JWT doesn't have correct claims
**Fix:**
- Verify `sub` claim contains `{{user.id}}`
- Ensure `role` is set to "authenticated"
- Check signing key matches Supabase JWT secret

## Testing the Integration

Once configured, test the full flow:

1. **Sign Up**: Create a new account via Clerk
2. **Create Profile**: Fill out the profile form
3. **Verify in Supabase**: 
   - Go to Supabase → Table Editor → profiles
   - You should see your profile with `clerk_user_id` populated
4. **Create Post**: Write a post and submit
5. **Verify Post**: 
   - Check Supabase → Table Editor → posts
   - Post should be linked to your profile via `author_id`

## How It Works

```
User Sign Up/Sign In
    ↓
Clerk Creates Session
    ↓
Frontend requests data
    ↓
API route calls getToken({template: 'supabase'})
    ↓
Clerk generates JWT signed with Supabase secret
    ↓
JWT contains: { sub: 'clerk_user_id', role: 'authenticated' }
    ↓
Supabase client uses JWT in Authorization header
    ↓
Supabase RLS policies check auth.jwt() ->> 'sub'
    ↓
User can only access their own data
```

## Quick Reference

| Setting | Value |
|---------|-------|
| Template Name | `supabase` |
| Algorithm | HS256 |
| Signing Key | Your Supabase JWT Secret |
| Token Lifetime | 60 seconds (default) |
| Critical Claim | `sub: {{user.id}}` |

---

**Need Help?** Check `/app/SETUP_GUIDE.md` for full setup instructions.
