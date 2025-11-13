import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client for serverless caching
 * Uses HTTP-based connection (no TCP management needed)
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Cache configuration
 */
export const CACHE_TTL = {
  FEED: 60, // 1 minute for feed posts
  PROFILE: 300, // 5 minutes for user profiles
  USER_SEARCH: 180, // 3 minutes for search results
  FRIENDS: 300, // 5 minutes for friends list
  NOTIFICATIONS: 30, // 30 seconds for notifications
  MESSAGES: 10, // 10 seconds for messages (real-time needs)
  LIKES: 60, // 1 minute for post likes
  COMMENTS: 60, // 1 minute for post comments
  FRIENDSHIP_STATUS: 300, // 5 minutes for friendship status
};

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  feed: (limit, offset) => `feed:${limit}:${offset}`,
  profile: (clerkUserId) => `profile:${clerkUserId}`,
  userSearch: (query, userId) => `search:${encodeURIComponent(query)}:${userId}`,
  friends: (userId) => `friends:${userId}`,
  friendRequests: (userId) => `friend-requests:${userId}`,
  notifications: (userId, unreadOnly) => `notifications:${userId}:${unreadOnly ? 'unread' : 'all'}`,
  conversations: (userId) => `conversations:${userId}`,
  messages: (conversationId) => `messages:${conversationId}`,
  postLikes: (postId) => `post-likes:${postId}`,
  postComments: (postId) => `post-comments:${postId}`,
  friendshipStatus: (userId, targetId) => `friendship:${userId}:${targetId}`,
  friendsCount: (userId) => `friends-count:${userId}`,
};

/**
 * Helper function to get cached data or fetch if not available
 */
export async function getCachedOrFetch(key, ttl, fetchFn) {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      console.log(`Cache HIT: ${key}`);
      return cached;
    }

    console.log(`Cache MISS: ${key}`);
    // Fetch fresh data
    const data = await fetchFn();

    // Store in cache
    if (data) {
      await redis.setex(key, ttl, data);
    }

    return data;
  } catch (error) {
    console.error(`Redis error for key ${key}:`, error);
    // Fallback to direct fetch if Redis fails
    return await fetchFn();
  }
}

/**
 * Invalidate cache for specific patterns
 */
export async function invalidateCache(pattern) {
  try {
    // For pattern-based deletion, we'll need to track keys
    // Upstash Redis supports SCAN but for simplicity, we'll delete specific keys
    await redis.del(pattern);
    console.log(`Cache invalidated: ${pattern}`);
  } catch (error) {
    console.error(`Error invalidating cache ${pattern}:`, error);
  }
}

/**
 * Invalidate multiple cache keys at once
 */
export async function invalidateMultiple(keys) {
  try {
    if (keys.length === 0) return;
    await redis.del(...keys);
    console.log(`Cache invalidated: ${keys.length} keys`);
  } catch (error) {
    console.error(`Error invalidating multiple cache keys:`, error);
  }
}
