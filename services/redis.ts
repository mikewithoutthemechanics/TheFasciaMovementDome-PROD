/**
 * Redis Service - Upstash Redis for Vercel Serverless
 * 
 * Provides caching, session storage, and rate limiting support
 * for serverless environments (Vercel, etc.)
 * 
 * Get started:
 * 1. Create a database at https://upstash.com
 * 2. Copy the UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * 3. Add to Vercel environment variables
 */

import { Redis } from '@upstash/redis';

// Redis client instance (lazy initialized)
let redis: Redis | null = null;

/**
 * Initialize Redis client with Upstash credentials
 * Uses REST API for Vercel serverless compatibility
 */
function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!restUrl || !restToken) {
    console.warn('⚠️ Redis (Upstash) not configured - caching disabled');
    console.warn('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel');
    return null;
  }
  
  try {
    redis = new Redis({
      url: restUrl,
      token: restToken,
    });
    console.log('✅ Redis (Upstash) connected successfully');
    return redis;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    return null;
  }
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const value = await client.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Set value in cache with optional TTL (seconds)
 */
export async function setCache<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    if (ttlSeconds) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
}

/**
 * Delete key from cache
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
}

/**
 * Check if key exists in cache
 */
export async function existsCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis exists error:', error);
    return false;
  }
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Simple rate limiter using Redis
 * Returns true if request is allowed, false if rate limited
 * 
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param limit - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds
 */
export async function checkRateLimit(
  key: string, 
  limit: number, 
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedisClient();
  if (!client) {
    // If Redis not configured, allow request (fail-open)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
  }
  
  const rateKey = `ratelimit:${key}`;
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  
  try {
    // Use sliding window rate limiting
    const result = await client.multi()
      .zadd(rateKey, { score: now, member: `${now}` })
      .zremrangebyscore(rateKey, 0, now - windowSeconds * 1000)
      .zcard(rateKey)
      .exec();
    
    const count = result[2] as number;
    
    if (count > limit) {
      // Rate limited - remove the request we just added
      await client.zrem(rateKey, `${now}`);
      return { allowed: false, remaining: 0, resetAt };
    }
    
    // Clean up old entries periodically
    if (count > limit * 2) {
      await client.zremrangebyscore(rateKey, 0, now - windowSeconds * 1000);
    }
    
    return { 
      allowed: true, 
      remaining: Math.max(0, limit - count), 
      resetAt 
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request on error
    return { allowed: true, remaining: limit, resetAt };
  }
}

// ============================================
// SESSION/STORAGE OPERATIONS
// ============================================

/**
 * Store session data with TTL
 */
export async function setSession<T>(
  sessionId: string, 
  data: T, 
  ttlSeconds: number = 86400 // 24 hours default
): Promise<boolean> {
  return setCache(`session:${sessionId}`, data, ttlSeconds);
}

/**
 * Get session data
 */
export async function getSession<T>(sessionId: string): Promise<T | null> {
  return getCache<T>(sessionId);
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  return deleteCache(`session:${sessionId}`);
}

// ============================================
// UTILITY
// ============================================

/**
 * Check if Redis is available
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get Redis configuration status for debugging
 */
export function getRedisStatus() {
  const configured = isRedisConfigured();
  return {
    isConfigured: configured,
    hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    urlConfigured: configured 
      ? `${process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30)}...` 
      : 'NOT SET'
  };
}

export const redisService = {
  // Cache operations
  get: getCache,
  set: setCache,
  delete: deleteCache,
  exists: existsCache,
  
  // Rate limiting
  checkRateLimit,
  
  // Session management
  setSession,
  getSession,
  deleteSession,
  
  // Status
  isConfigured: isRedisConfigured,
  getStatus: getRedisStatus,
};

export default redisService;
