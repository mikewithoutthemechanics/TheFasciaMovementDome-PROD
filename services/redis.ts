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
 * 
 * Note: This is a stub implementation. The @upstash/redis package
 * needs to be installed for full functionality.
 */

// Stub implementation - returns gracefully when Redis is not configured
// To enable: npm install @upstash/redis and uncomment the import

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RedisStatus {
  isConfigured: boolean;
  hasUrl: boolean;
  hasToken: boolean;
  urlConfigured: string;
}

/**
 * Check if Redis is available (always returns false for stub)
 */
export function isRedisConfigured(): boolean {
  return false;
}

/**
 * Get Redis configuration status for debugging
 */
export function getRedisStatus(): RedisStatus {
  return {
    isConfigured: false,
    hasUrl: false,
    hasToken: false,
    urlConfigured: 'NOT SET - npm install @upstash/redis to enable'
  };
}

/**
 * Get value from cache (stub - always returns null)
 */
export async function getCache<T>(_key: string): Promise<T | null> {
  console.warn('⚠️ Redis not configured - caching disabled');
  return null;
}

/**
 * Set value in cache with optional TTL (stub - always returns false)
 */
export async function setCache<T>(
  _key: string, 
  _value: T, 
  _ttlSeconds?: number
): Promise<boolean> {
  console.warn('⚠️ Redis not configured - caching disabled');
  return false;
}

/**
 * Delete key from cache (stub - always returns false)
 */
export async function deleteCache(_key: string): Promise<boolean> {
  return false;
}

/**
 * Check if key exists in cache (stub - always returns false)
 */
export async function existsCache(_key: string): Promise<boolean> {
  return false;
}

/**
 * Simple rate limiter (stub - always allows)
 */
export async function checkRateLimit(
  _key: string, 
  limit: number, 
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  return { 
    allowed: true, 
    remaining: limit, 
    resetAt: Date.now() + windowSeconds * 1000 
  };
}

/**
 * Store session data with TTL (stub - always returns false)
 */
export async function setSession<T>(
  _sessionId: string, 
  _data: T, 
  _ttlSeconds?: number
): Promise<boolean> {
  return false;
}

/**
 * Get session data (stub - always returns null)
 */
export async function getSession<T>(_sessionId: string): Promise<T | null> {
  return null;
}

/**
 * Delete session (stub - always returns false)
 */
export async function deleteSession(_sessionId: string): Promise<boolean> {
  return false;
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
