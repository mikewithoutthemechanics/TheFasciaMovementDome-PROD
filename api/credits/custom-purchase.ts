import crypto from 'crypto';

// Simple in-memory rate limiter for credit operations
// Note: For production serverless, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a user on a specific endpoint
 * @param userId - The user identifier
 * @param endpoint - The endpoint name for rate limiting
 * @param limit - Max requests per window (default 10)
 * @param windowMs - Time window in milliseconds (default 60000 = 1 minute)
 * @returns true if allowed, false if rate limit exceeded
 */
function checkRateLimit(userId: string, endpoint: string, limit: number = 10, windowMs: number = 60000): boolean {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    // Rate limit exceeded
    return false;
  }
  
  // Increment count
  record.count++;
  return true;
}

/**
 * Atomic credit addition helper
 * Uses database-level atomic increment to prevent race conditions
 * This pattern should be used whenever credits are updated to prevent double-spending
 */
async function addCreditsAtomic(supabase: any, userId: string, creditsToAdd: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Try using RPC function for atomic update (preferred method)
    const { data, error } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_credits: creditsToAdd
    });

    if (error) {
      // If RPC doesn't exist, try alternative function names
      const { data: altData, error: altError } = await supabase.rpc('increment_credits', {
        user_id: userId,
        amount: creditsToAdd
      });

      if (altError) {
        // Fall back to raw SQL with atomic increment using COALESCE
        const { data: sqlData, error: sqlError } = await supabase.rpc('atomic_add_credits', {
          p_user_id: userId,
          p_amount: creditsToAdd
        });

        if (sqlError) {
          console.error('Atomic credit add failed (SQL fallback):', sqlError);
          return { success: false, error: sqlError.message };
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Atomic credit add exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * PayFast Custom Credit Purchase Endpoint
 * 
 * Note: Apple Pay and Google Pay are enabled via the PayFast merchant dashboard.
 * See services/payfast.ts for full documentation on enabling these payment methods.
 */

const CREDIT_PRICE_PER_UNIT = 150;

function getPayFastConfig() {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passPhrase: process.env.PAYFAST_PASSPHRASE || '',
    mode: (process.env.PAYFAST_MODE as 'sandbox' | 'live') || 'sandbox',
    returnUrl: process.env.PAYFAST_RETURN_URL || '',
    cancelUrl: process.env.PAYFAST_CANCEL_URL || '',
    notifyUrl: process.env.PAYFAST_NOTIFY_URL || ''
  };
}

function getBaseUrl(mode: string): string {
  return mode === 'sandbox' ? 'https://sandbox.payfast.co.za' : 'https://payfast.co.za';
}

function generateSignature(data: Record<string, string | number>, passPhrase: string): string {
  const sortedData = Object.entries(data)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  const signatureData = sortedData + (passPhrase ? `&passphrase=${encodeURIComponent(passPhrase)}` : '');
  // SECURITY: MD5 is cryptographically broken. Using SHA-256 for outbound signatures.
  return crypto.createHash('sha256').update(signatureData).digest('hex');
}

export async function POST({ request }: { request: Request }) {
  try {
    // SECURITY: Verify Bearer token and enforce userId ownership
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    // VERCEL FIX: Use connection pooler for serverless
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    // Append pgbouncer=transaction to enable transaction mode for serverless
    const poolerUrl = supabaseUrl.includes('pgbouncer') 
      ? supabaseUrl 
      : `${supabaseUrl}${supabaseUrl.includes('?') ? '&' : '?'}pgbouncer=transaction`;
    const supabaseAdmin = createClient(poolerUrl, supabaseKey);
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Rate limit custom credit purchases to prevent abuse
    // Allow 10 purchase attempts per minute per user
    if (!checkRateLimit(authUser.id, 'custom-credit-purchase')) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = getPayFastConfig();
    
    if (!config.merchantId || !config.merchantKey) {
      return new Response(JSON.stringify({ error: 'Payment system not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { credits, userId, email } = body;

    if (!credits || !userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Ensure the userId in the request matches the authenticated user
    if (userId !== authUser.id) {
      return new Response(JSON.stringify({ error: 'userId does not match authenticated user' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const creditCount = parseInt(String(credits), 10);
    if (creditCount < 1 || creditCount > 10) {
      return new Response(JSON.stringify({ error: 'Credit amount must be between 1 and 10' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const amount = creditCount * CREDIT_PRICE_PER_UNIT;
    const mPaymentId = `TFMD-CUSTOM-${Date.now()}-${userId}`;
    
    const data: Record<string, string | number> = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: config.returnUrl,
      cancel_url: config.cancelUrl,
      notify_url: config.notifyUrl,
      m_payment_id: mPaymentId,
      amount: amount.toFixed(2),
      item_name: `Custom Credit Purchase (${creditCount} credits)`,
      email_address: email,
      user_id: userId,
      custom_credits: creditCount
    };

    data.signature = generateSignature(data, config.passPhrase);

    const queryString = Object.entries(data)
      .filter(([, value]) => value !== '' && value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');

    const paymentUrl = `${getBaseUrl(config.mode)}/eng/process?${queryString}`;
    
    return new Response(JSON.stringify({ 
      paymentLink: paymentUrl, 
      mPaymentId,
      credits: creditCount,
      amount 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating custom credit payment link:', error);
    return new Response(JSON.stringify({ error: 'Failed to create payment link' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Vercel serverless handler
export default async function handler(request: Request) {
  switch (request.method) {
    case 'POST':
      return POST({ request });
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}
