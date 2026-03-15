import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, ErrorCodes } from '../../utils/error-response';
import * as crypto from 'crypto';

const router = Router();

// Get Supabase URL and key from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// PayFast Configuration
// ============================================================================

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
const PAYFAST_MODE = process.env.PAYFAST_MODE || 'sandbox';

const PAYFAST_URLS = {
  sandbox: 'https://sandbox.payfast.co.za/eng/process',
  live: 'https://www.payfast.co.za/eng/process'
};

// ============================================================================
// Helper Functions
// ============================================================================

function isValidPayFastIP(ip: string): boolean {
  const payFastRanges = ['196.41.0.0/21', '196.41.8.0/21'];
  
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  
  const ipLong = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  
  for (const range of payFastRanges) {
    const [baseIp, bits] = range.split('/');
    const baseLong = baseIp.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    const mask = -1 << (32 - parseInt(bits));
    
    if ((ipLong & mask) === (baseLong & mask)) {
      return true;
    }
  }
  
  return false;
}

function generatePayFastSignature(data: Record<string, string>): string {
  const sortedKeys = Object.keys(data).sort();
  const signatureString = sortedKeys
    .filter(key => data[key] !== undefined && data[key] !== '')
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

// ============================================================================
// Credit Packages Endpoints
// ============================================================================

router.get('/packages', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { data: packages, error } = await supabase
      .from('credit_packages')
      .select('id, name, credits, price, bonus_credits, description')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching packages:', error);
      return res.status(500).json(errorResponse('Failed to fetch packages', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({
      packages: packages || [],
      currency: 'ZAR'
    });
  } catch (error) {
    console.error('Packages endpoint error:', error);
    res.status(500).json(errorResponse('Failed to fetch packages', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Purchase Endpoint
// ============================================================================

router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { packageId, userId, returnUrl, cancelUrl } = req.body;
    
    if (!packageId || !userId) {
      return res.status(400).json(errorResponse('Package ID and User ID are required', ErrorCodes.VALIDATION_ERROR));
    }
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(userId)) {
      return res.status(400).json(errorResponse('Invalid user ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get package from database
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('id, name, credits, price, bonus_credits')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();
    
    if (packageError || !creditPackage) {
      return res.status(400).json(errorResponse('Invalid credit package', ErrorCodes.VALIDATION_ERROR));
    }
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return res.status(404).json(errorResponse('User not found', ErrorCodes.NOT_FOUND));
    }
    
    const timestamp = Date.now();
    const paymentId = `TFMD-${timestamp}-${userId}`;
    
    const payFastData: Record<string, string> = {
      merchant_id: PAYFAST_MERCHANT_ID!,
      merchant_key: PAYFAST_MERCHANT_KEY!,
      return_url: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
      notify_url: `${process.env.API_URL}/api/payments/payfast/notify`,
      name_first: user.first_name || '',
      name_last: user.last_name || '',
      email_address: user.email,
      m_payment_id: paymentId,
      amount: creditPackage.price.toFixed(2),
      item_name: creditPackage.name,
      item_description: `${creditPackage.credits} class credits${creditPackage.bonus_credits ? ` + ${creditPackage.bonus_credits} bonus` : ''}`,
      custom_str1: userId,
      custom_str2: creditPackage.id,
      custom_int1: creditPackage.credits.toString()
    };
    
    if (PAYFAST_PASSPHRASE) {
      payFastData.passphrase = PAYFAST_PASSPHRASE;
    }
    
    payFastData.signature = generatePayFastSignature(payFastData);
    
    res.json({
      paymentUrl: PAYFAST_URLS[PAYFAST_MODE as keyof typeof PAYFAST_URLS],
      paymentData: payFastData,
      paymentId
    });
    
  } catch (error) {
    console.error('Payment purchase error:', error);
    res.status(500).json(errorResponse('Failed to create payment', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Payment Status Endpoint
// ============================================================================

router.get('/payfast/status', (_req: Request, res: Response) => {
  try {
    const isConfigured = !!(PAYFAST_MERCHANT_ID && PAYFAST_MERCHANT_KEY);
    res.json({ configured: isConfigured, mode: PAYFAST_MODE });
  } catch (error) {
    console.error('Error checking PayFast status:', error);
    res.status(500).json(errorResponse('Failed to check payment status', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// PayFast ITN Handler
// ============================================================================

router.post('/payfast/notify', async (req: Request, res: Response) => {
  try {
    const notificationData = req.body;
    const clientIP = req.ip || req.socket.remoteAddress || '';
    
    console.log('PayFast ITN received:', notificationData);
    
    if (!isValidPayFastIP(clientIP)) {
      console.error(`PayFast ITN: Invalid source IP ${clientIP}`);
      return res.status(403).send('INVALID SOURCE');
    }
    
    if (!notificationData || typeof notificationData !== 'object') {
      return res.status(400).send('INVALID DATA');
    }
    
    const { payment_status, m_payment_id, amount } = notificationData;
    
    if (!payment_status || !m_payment_id || !amount) {
      return res.status(400).send('MISSING FIELDS');
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).send('INVALID AMOUNT');
    }
    
    if (typeof m_payment_id !== 'string' || !m_payment_id.startsWith('TFMD-')) {
      return res.status(400).send('INVALID PAYMENT ID');
    }
    
    const parts = m_payment_id.split('-');
    const purchaseUserId = parts.length >= 3 ? parts.slice(2).join('-') : notificationData.user_id;
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (purchaseUserId && !UUID_REGEX.test(purchaseUserId)) {
      return res.status(400).send('INVALID USER ID');
    }
    
    if (payment_status === 'COMPLETE') {
      // Idempotency check - skip if already processed
      const supabase = createClient(supabaseUrl!, supabaseKey!);
      
      const { data: existingLog } = await supabase
        .from('payment_logs')
        .select('id, status')
        .eq('payment_id', m_payment_id)
        .single();
      
      if (existingLog && existingLog.status === 'completed') {
        console.log(`Payment ${m_payment_id} already processed, skipping`);
        return res.send('OK');
      }
      
      // Get price from database
      const packageId = notificationData.custom_str2;
      const { data: dbPackage, error: packageError } = await supabase
        .from('credit_packages')
        .select('credits, price, bonus_credits')
        .eq('id', packageId)
        .eq('is_active', true)
        .single();
      
      if (packageError || !dbPackage) {
        console.error(`Unknown credit package: ${packageId}`);
        return res.send('OK');
      }
      
      // Verify amount matches database price
      if (parsedAmount !== dbPackage.price) {
        console.error(`Amount mismatch. Expected ${dbPackage.price}, got ${parsedAmount}`);
        return res.send('OK');
      }
      
      const totalCredits = dbPackage.credits + (dbPackage.bonus_credits || 0);
      
      // Use atomic RPC function to add credits (prevents race conditions)
      const { error: rpcError } = await supabase.rpc('increment_user_credits', {
        user_id: purchaseUserId,
        amount: totalCredits
      });
      
      if (rpcError) {
        console.error(`Failed to add credits via RPC: ${rpcError.message}`);
        return res.status(500).send('CREDIT_UPDATE_FAILED');
      }
      await supabase.from('payment_logs').insert({
        payment_id: m_payment_id,
        user_id: purchaseUserId,
        amount: parsedAmount,
        credits: totalCredits,
        package_id: packageId,
        status: 'completed',
        raw_data: notificationData
      });
      
      console.log(`PayFast ITN: ${totalCredits} credits added to user ${purchaseUserId}`);
    }
    
    res.send('OK');
  } catch (error) {
    console.error('PayFast ITN error:', error);
    res.status(500).send('ERROR');
  }
});

// ============================================================================
// User Credits Endpoints
// ============================================================================

router.get('/credits/:userId', async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(userId)) {
      return res.status(400).json(errorResponse('Invalid user ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { data: user, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to get credits', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({ credits: user?.credits || 0 });
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json(errorResponse('Failed to get credits', ErrorCodes.INTERNAL_ERROR));
  }
});

router.post('/credits/deduct', async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason } = req.body;
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json(errorResponse('User ID and positive amount are required', ErrorCodes.VALIDATION_ERROR));
    }
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(userId)) {
      return res.status(400).json(errorResponse('Invalid user ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // SECURITY FIX: Use atomic RPC to prevent race conditions
    const { data: deductedAmount, error: rpcError } = await supabase.rpc('deduct_user_credits', {
      user_id: userId,
      amount: amount
    });
    
    if (rpcError) {
      console.warn('RPC failed, using fallback: ' + rpcError.message);
      const { data: user } = await supabase.from('users').select('credits').eq('id', userId).single();
      const currentCredits = user?.credits || 0;
      if (currentCredits < amount) {
        return res.status(400).json(errorResponse('Insufficient credits', ErrorCodes.VALIDATION_ERROR));
      }
      await supabase.from('users').update({ credits: currentCredits - amount, updated_at: new Date().toISOString() }).eq('id', userId);
    } else if (deductedAmount === 0 || deductedAmount === null) {
      return res.status(400).json(errorResponse('Insufficient credits', ErrorCodes.VALIDATION_ERROR));
    }
    
    await supabase.from('credit_transactions').insert({
      user_id: userId, amount: -amount, type: 'deduction', reason: reason || 'Class booking'
    });
    
    const { data: updatedUser } = await supabase.from('users').select('credits').eq('id', userId).single();
    res.json({ success: true, remainingCredits: updatedUser?.credits || 0 });
  } catch (error) {
    console.error('Deduct credits error:', error);
    res.status(500).json(errorResponse('Failed to deduct credits', ErrorCodes.INTERNAL_ERROR));
  }
});
export default router;
