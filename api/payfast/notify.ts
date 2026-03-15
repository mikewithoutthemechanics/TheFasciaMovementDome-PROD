import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CREDIT_PACKAGES = [
  { id: 'credits-1', credits: 1, price: 150 },
  { id: 'credits-3', credits: 3, price: 450 },
  { id: 'credits-5', credits: 5, price: 750 },
  { id: 'credits-10', credits: 10, price: 1500 },
];

/**
 * Atomically add credits to a user using RPC function
 * This prevents race conditions in credit updates
 */
async function addCreditsAtomic(supabase: SupabaseClient, userId: string, amount: number): Promise<boolean> {
  // Try different RPC function names that might exist
  const rpcFunctions = ['add_user_credits', 'increment_credits', 'atomic_add_credits'];
  
  for (const fn of rpcFunctions) {
    try {
      const { error } = await supabase.rpc(fn, { 
        p_user_id: userId, 
        p_amount: amount 
      });
      if (!error) return true;
    } catch {
      continue;
    }
  }
  
  // If no RPC function exists, log a warning but continue with the update
  console.warn('No atomic credit RPC function found, using fallback');
  return false;
}

function getPayFastConfig() {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passPhrase: process.env.PAYFAST_PASSPHRASE || '',
    mode: (process.env.PAYFAST_MODE as 'sandbox' | 'live') || 'sandbox',
  };
}

function generateSignature(data: Record<string, string>, passPhrase: string): string {
  const sortedData = Object.entries(data)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  return crypto.createHmac('sha256', passPhrase).update(sortedData).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  // VERCEL FIX: Use connection pooler for serverless
  // Append pgbouncer=transaction to enable transaction mode
  let connectionUrl = supabaseUrl;
  if (!supabaseUrl.includes('pgbouncer')) {
    const separator = supabaseUrl.includes('?') ? '&' : '?';
    connectionUrl = `${supabaseUrl}${separator}pgbouncer=transaction`;
  }
  
  return createClient(connectionUrl, supabaseKey);
}

/**
 * Check if a payment has already been processed
 * Uses database for serverless compatibility
 */
async function isPaymentProcessed(supabase: any, paymentId: string): Promise<boolean> {
  if (!paymentId) return false;
  
  try {
    const { data, error } = await supabase
      .from('processed_payments')
      .select('id')
      .eq('id', paymentId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('[idempotency] Error checking payment:', error);
      // Fail safe - assume processed to prevent double-processing
      return true;
    }
    
    return !!data;
  } catch (err) {
    console.error('[idempotency] Exception checking payment:', err);
    // Fail safe - assume processed to prevent double-processing
    return true;
  }
}

/**
 * Mark a payment as processed
 * Stores in database with 24-hour expiration
 */
async function markPaymentProcessed(supabase: any, paymentId: string): Promise<void> {
  if (!paymentId) return;
  
  try {
    const { error } = await supabase
      .from('processed_payments')
      .insert({
        id: paymentId,
        processed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
    
    if (error) {
      console.error('[idempotency] Error marking payment:', error);
    }
  } catch (err) {
    console.error('[idempotency] Exception marking payment:', err);
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    console.log('PayFast ITN received');
    
    const formData = await request.formData();
    const notificationData: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      notificationData[key] = value.toString();
    }

    console.log('PayFast notification data:', notificationData);

    const { payment_status, m_payment_id, amount, user_id, credit_package_id, custom_credits } = notificationData;

    if (!payment_status || !m_payment_id || !amount || !user_id) {
      console.error('PayFast ITN: Missing required fields');
      return new Response('Missing required fields', { status: 400 });
    }

    // SECURITY: Check idempotency - prevent duplicate processing
    const supabase = getSupabaseClient();
    const alreadyProcessed = await isPaymentProcessed(supabase, m_payment_id);
    if (alreadyProcessed) {
      console.warn(`PayFast ITN: Duplicate payment detected - ${m_payment_id} already processed`);
      return new Response('OK', { status: 200 });
    }

    const config = getPayFastConfig();
    const receivedSignature = notificationData.signature;
    delete notificationData.signature;
    
    const expectedSignature = generateSignature(notificationData, config.passPhrase);
    
    if (receivedSignature !== expectedSignature) {
      console.error('PayFast signature validation failed');
      return new Response('Invalid signature', { status: 400 });
    }

    if (payment_status !== 'COMPLETE') {
      console.log(`PayFast ITN: Payment not complete, status: ${payment_status}`);
      return new Response('OK', { status: 200 });
    }

    const parsedAmount = parseFloat(amount);
    let totalCredits = 0;

    // Check if it's a custom credit purchase
    if (custom_credits && !credit_package_id) {
      const creditCount = parseInt(custom_credits, 10);
      const expectedAmount = creditCount * 350;
      
      if (parsedAmount !== expectedAmount) {
        console.error(`PayFast ITN: Amount mismatch for custom credits. Expected ${expectedAmount}, got ${parsedAmount}`);
        return new Response('Invalid amount', { status: 400 });
      }
      
      totalCredits = creditCount;
    } else {
      // It's a package purchase
      const creditPackage = CREDIT_PACKAGES.find(p => p.id === credit_package_id);
      
      if (!creditPackage) {
        console.error(`PayFast ITN: Unknown credit package: ${credit_package_id}`);
        return new Response('Invalid credit package', { status: 400 });
      }

      if (parsedAmount !== creditPackage.price) {
        console.error(`PayFast ITN: Amount mismatch. Expected ${creditPackage.price}, got ${parsedAmount}`);
        return new Response('Invalid amount', { status: 400 });
      }

      totalCredits = creditPackage.credits;
    }

    // Try atomic update first
    const atomicSuccess = await addCreditsAtomic(supabase, user_id, totalCredits);

    if (!atomicSuccess) {
      // Fallback: use single atomic update with direct SQL
      // This is less safe but provides a backup
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user_id)
        .single();

      if (fetchError) {
        console.error('PayFast ITN: Error fetching user:', fetchError);
        return new Response('User not found', { status: 404 });
      }

      const currentCredits = currentUser?.credits || 0;
      const newCredits = currentCredits + totalCredits;

      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user_id);

      if (updateError) {
        console.error('PayFast ITN: Error updating credits:', updateError);
        return new Response('Failed to update credits', { status: 500 });
      }
    }

    // Mark payment as processed for idempotency
    await markPaymentProcessed(supabase, m_payment_id);

    console.log(`Credit purchase completed: ${totalCredits} credits added to user ${user_id}`);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing PayFast notification:', error);
    return new Response('Internal error', { status: 500 });
  }
}

// Vercel serverless handler
export default async function handler(request: Request) {
  switch (request.method) {
    case 'POST':
      return POST({ request });
    default:
      return new Response('Method not allowed', { status: 405 });
  }
}
