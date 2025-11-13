# Upstash Redis Setup Guide

## Overview
This project uses Upstash Redis for serverless caching to improve performance and reduce database load. Upstash provides HTTP-based Redis access, perfect for serverless environments like Vercel.

## Features Cached
1. **Feed Posts** - User's home feed (60s TTL)
2. **User Search** - Search results (3 minutes TTL)
3. **User Profiles** - Profile data (5 minutes TTL)
4. **Friends List** - User's friends (5 minutes TTL)
5. **Notifications** - User notifications (30s TTL)
6. **Messages** - Conversation messages (10s TTL)
7. **Likes** - Post likes count (60s TTL)
8. **Comments** - Post comments (60s TTL)
9. **Friendship Status** - User relationships (5 minutes TTL)

## Setup Instructions

### 1. Create Upstash Account
1. Go to [https://console.upstash.com/](https://console.upstash.com/)
2. Sign up for a free account
3. Create a new Redis database

### 2. Get Credentials
After creating your database, you'll get:
- `UPSTASH_REDIS_REST_URL` - The HTTP REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Authentication token

### 3. Configure Environment Variables
Add these to your `.env` file:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 4. Install Package
```bash
yarn add @upstash/redis
```

### 5. Vercel Deployment
When deploying to Vercel:
1. Go to your project settings
2. Add the same environment variables
3. Upstash has a Vercel integration for easy setup

## Cache Strategy

### Cache-Aside Pattern
- Check cache first
- If miss, fetch from database
- Store in cache for future requests
- Auto-expiration based on TTL

### Invalidation Strategy
- **On Create**: Invalidate feed, friends list
- **On Update**: Invalidate specific item cache
- **On Delete**: Invalidate related caches
- **On Friend Action**: Invalidate friendship status, friends count

## Performance Benefits
- ⚡ **Instant Search Results** - Cached search queries
- 🚀 **Faster Feed Loading** - No repeated DB queries
- 📉 **Reduced DB Load** - Less Supabase queries
- 💰 **Cost Savings** - Lower database usage
- 🌍 **Global Edge Caching** - Upstash is distributed globally

## Monitoring
Monitor cache performance in Upstash console:
- Hit/miss ratio
- Request count
- Memory usage
- Latency metrics

## Best Practices
1. **Short TTL for real-time data** (messages, notifications)
2. **Longer TTL for static data** (profiles, user info)
3. **Invalidate on writes** (posts, likes, comments)
4. **Graceful degradation** (fallback to DB if Redis fails)

## Cost
- **Free Tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.2 per 100K commands
- Perfect for small to medium apps

## Implementation Files
- `lib/redis/client.js` - Redis client and utilities
- `app/api/**/route.js` - API routes with caching
- Each API endpoint includes cache logic

## Next Steps
After setting up:
1. Add your Upstash credentials to `.env`
2. Test locally with `yarn dev`
3. Deploy to Vercel
4. Monitor performance in Upstash console
