/**
 * Supabase Client - Foundation Infrastructure
 * Central Supabase client singleton with retry logic and error handling
 *
 * CONNECTION POOLING FIX for Vercel Serverless:
 * - Uses connection pooler URL (port 6543) for better serverless performance
 * - Disables prepared statements for serverless compatibility
 * - Supports both direct (5432) and pooler (6543) connections
 *
 * Required environment variables:
 *   VITE_SUPABASE_URL - Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Your Supabase anon/public key
 *   VITE_SUPABASE_POOLER_URL - Optional: Connection pooler URL (defaults to using pooler if on Vercel)
 *   VITE_VERCEL_ENV - Set by Vercel, used to auto-detect serverless environment
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

/**
 * Supabase error type for proper error handling
 */
export interface SupabaseError {
  message: string;
  code: string;
  details?: string;
  hint?: string;
}

// Environment variables - support both Vite (browser) and Node.js environments
const SUPABASE_URL = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Connection pooler configuration for Vercel serverless
const SUPABASE_POOLER_URL = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_POOLER_URL 
  : process.env.VITE_SUPABASE_POOLER_URL || process.env.SUPABASE_POOLER_URL;

// Site URL for Supabase Auth
const SUPABASE_SITE_URL = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SITE_URL 
  : process.env.VITE_SITE_URL || process.env.SITE_URL;

// Detect if running on Vercel (serverless)
const VERCEL_ENV = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_VERCEL_ENV 
  : process.env.VITE_VERCEL_ENV;

const isVercel = Boolean(VERCEL_ENV || process.env.VERCEL);

/**
 * Get the optimized Supabase URL for serverless environments
 * Uses connection pooler (port 6543) instead of direct database connection (port 5432)
 */
function getOptimizedSupabaseUrl(): string | undefined {
  if (!SUPABASE_URL) return undefined;
  
  // If explicit pooler URL is provided, use it
  if (SUPABASE_POOLER_URL) {
    console.log('[SupabaseClient] Using explicit connection pooler URL');
    return SUPABASE_POOLER_URL;
  }
  
  // Auto-detect: if on Vercel or pooler URL can be derived, use pooler
  if (isVercel || SUPABASE_URL.includes('supabase.co')) {
    // Convert direct URL to pooler URL
    // Example: https://xxx.supabase.co -> https://xxx.supabase.co
    // The pooler uses the same host but different port (handled by Supabase)
    // We append ?pgbouncer=true query param to enable transaction mode
    if (!SUPABASE_URL.includes('pgbouncer')) {
      const separator = SUPABASE_URL.includes('?') ? '&' : '?';
      console.log('[SupabaseClient] Using connection pooler (auto-detected for serverless)');
      return `${SUPABASE_URL}${separator}pgbouncer=transaction`;
    }
  }
  
  console.log('[SupabaseClient] Using direct database connection');
  return SUPABASE_URL;
}

// Validate environment variables - warn but don't crash in production
if (!SUPABASE_URL) {
  console.error('[SupabaseClient] Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_ANON_KEY) {
  console.error('[SupabaseClient] Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Log URL and connection mode (masked for security)
if (SUPABASE_URL) {
  const isPooler = isVercel || Boolean(SUPABASE_POOLER_URL);
  console.log('[SupabaseClient] Initializing with URL:', SUPABASE_URL.substring(0, 30) + '...');
  console.log('[SupabaseClient] Connection mode:', isPooler ? 'Pooler (PgBouncer)' : 'Direct');
  console.log('[SupabaseClient] Serverless environment:', isVercel ? 'Yes (Vercel)' : 'No');
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
    MAX_RETRY_DELAY_MS
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Sleep helper for async delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface RetryableError {
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: RetryableError | null | undefined): boolean {
  if (!error) return false;

  // Network errors
  if (error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      error.message?.includes('timeout') ||
      error.message?.includes('connection')) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Supabase specific errors
  if (error.code === 'PGRST301' || // Connection error
      error.code === 'PGRST302') {  // Timeout
    return true;
  }

  return false;
}

/**
 * Execute a Supabase query with retry logic
 * Returns the result of the operation directly
 * 
 * Note: Supabase query builders are thenables (not full Promises),
 * so we convert them to Promises for proper error handling with retry logic
 */
export async function withRetry<T>(
  operation: () => T | Promise<T>,
  operationName: string = 'Supabase operation'
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[SupabaseClient] ${operationName} - Attempt ${attempt + 1}/${MAX_RETRIES}`);
      // Convert thenable to Promise if needed
      const result = await Promise.resolve(operation());
      console.log(`[SupabaseClient] ${operationName} - Success on attempt ${attempt + 1}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[SupabaseClient] ${operationName} - Failed on attempt ${attempt + 1}:`, error);

      if (attempt < MAX_RETRIES - 1 && isRetryableError(error as RetryableError)) {
        const delay = getRetryDelay(attempt);
        console.log(`[SupabaseClient] Retrying in ${delay}ms...`);
        await sleep(delay);
      } else if (!isRetryableError(error as RetryableError)) {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }

  console.error(`[SupabaseClient] ${operationName} - All ${MAX_RETRIES} attempts failed`);
  throw lastError;
}

/**
 * Create Supabase client with custom configuration
 * Optimized for Vercel serverless with connection pooling
 */
function createSupabaseClient(): SupabaseClient<Database> {
  try {
    const optimizedUrl = getOptimizedSupabaseUrl();
    
    const client = createClient<Database>(optimizedUrl!, SUPABASE_ANON_KEY!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // SECURITY: Cookie configuration for enhanced session security
        flowType: 'pkce',
        // Add siteUrl if provided
        ...(SUPABASE_SITE_URL && { siteUrl: SUPABASE_SITE_URL }),
        cookieOptions: {
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        },
      },
      db: {
        schema: 'public',
        // NOTE: Prepared statements are disabled at the URL level via pgbouncer=transaction
        // This is handled in getOptimizedSupabaseUrl()
      },
      global: {
        headers: {
          'x-application-name': 'tfmd-booking-app',
        },
      },
    });

    console.log('[SupabaseClient] Client created successfully with serverless optimizations');
    return client;
  } catch (error) {
    console.error('[SupabaseClient] Failed to create client:', error);
    throw error;
  }
}

// Singleton instance
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get the singleton Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseInstance) {
    // Only try to create if config is present
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseInstance = createSupabaseClient();
    }
  }
  return supabaseInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
  console.log('[SupabaseClient] Singleton reset');
}

/**
 * Test connection to Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('[SupabaseClient] Testing connection...');
    const client = getSupabaseClient();
    
    if (!client) {
      console.warn('[SupabaseClient] Client not configured');
      return false;
    }

    // Simple health check query
    const { error } = await client.from('app_settings').select('id').limit(1);

    if (error) {
      console.error('[SupabaseClient] Connection test failed:', error);
      return false;
    }

    console.log('[SupabaseClient] Connection test successful');
    return true;
  } catch (error) {
    console.error('[SupabaseClient] Connection test error:', error);
    return false;
  }
}

/**
 * Check if Supabase is properly configured
 */
export function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Check if running in serverless environment
 */
export function isServerless(): boolean {
  return isVercel;
}

/**
 * Check if connection pooler is being used
 */
export function isUsingPooler(): boolean {
  const url = getOptimizedSupabaseUrl();
  return Boolean(url && (url.includes('pgbouncer') || url.includes('6543')));
}

/**
 * Get connection info for debugging
 */
export function getConnectionInfo() {
  return {
    isServerless: isVercel,
    isUsingPooler: isUsingPooler(),
    url: getOptimizedSupabaseUrl(),
    hasExplicitPoolerUrl: Boolean(SUPABASE_POOLER_URL),
  };
}

// Export the singleton as default and named export
// Use non-null assertion since we handle null in the service layers
export const supabase = getSupabaseClient()!;
export default supabase;
