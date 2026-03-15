import crypto from 'crypto';

/**
 * PayFast Payment Service
 * 
 * Apple Pay and Google Pay Support:
 * ================================
 * PayFast supports Apple Pay and Google Pay through their Smart Checkout system.
 * 
 * TO ENABLE Apple Pay and Google Pay:
 * 1. Log in to your PayFast merchant dashboard at https://dashboard.payfast.co.za
 * 2. Go to Settings > Payment Methods (or similar)
 * 3. Enable Apple Pay and Google Pay payment methods
 * 4. Once enabled, these payment options will automatically appear on the checkout page
 *    for customers using compatible browsers/devices:
 *    - Apple Pay: Safari on iOS/macOS devices with Apple Pay configured
 *    - Google Pay: Chrome on Android/Desktop devices with Google Pay configured
 * 
 * Note: These payment methods are enabled on the PayFast side - no code changes needed
 * in this service. The payment forms will automatically display these options when
 * the merchant has enabled them in the PayFast dashboard and the customer uses a
 * compatible device/browser.
 * 
 * For more info: https://payfast.io/documentation/payments/apple-pay
 *                https://payfast.io/documentation/payments/google-pay
 */

interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passPhrase: string;
  mode: 'sandbox' | 'live';
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

interface PaymentData {
  amount: number;
  itemName: string;
  userId: string;
  email: string;
  creditPackageId?: string;
}

export class PayFastService {
  private config: PayFastConfig;

  constructor() {
    this.config = {
      merchantId: process.env.PAYFAST_MERCHANT_ID || '',
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
      passPhrase: process.env.PAYFAST_PASSPHRASE || '',
      mode: (process.env.PAYFAST_MODE as 'sandbox' | 'live') || 'sandbox',
      returnUrl: process.env.PAYFAST_RETURN_URL || '',
      cancelUrl: process.env.PAYFAST_CANCEL_URL || '',
      notifyUrl: process.env.PAYFAST_NOTIFY_URL || ''
    };
  }

  private getBaseUrl(): string {
    return this.config.mode === 'sandbox'
      ? 'https://sandbox.payfast.co.za'
      : 'https://payfast.co.za';
  }

  private generateSignature(data: Record<string, string | number>): string {
    const sortedData = Object.entries(data)
      .filter(([, value]) => value !== '' && value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');

    const signatureData = sortedData + (this.config.passPhrase ? `&passphrase=${encodeURIComponent(this.config.passPhrase)}` : '');
    
    // PayFast requires MD5 signature
    return crypto.createHash('md5').update(signatureData).digest('hex');
  }

  async createPaymentLink(paymentData: PaymentData): Promise<string> {
    const { amount, itemName, userId, email, creditPackageId } = paymentData;
    
    // SECURITY: Validate amount before creating payment link
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid payment amount: ${amount}. Amount must be a positive number.`);
    }

    // Cap to 2 decimal places to prevent floating point manipulation
    const safeAmount = Math.round(amount * 100) / 100;
    
    const mPaymentId = `TFMD-${Date.now()}-${userId}`;
    
    const data: Record<string, string | number> = {
      merchant_id: this.config.merchantId,
      merchant_key: this.config.merchantKey,
      return_url: this.config.returnUrl,
      cancel_url: this.config.cancelUrl,
      notify_url: this.config.notifyUrl,
      m_payment_id: mPaymentId,
      amount: safeAmount.toFixed(2),
      item_name: itemName,
      email_address: email,
      user_id: userId,
      credit_package_id: creditPackageId || ''
    };

    data.signature = this.generateSignature(data);

    const queryString = Object.entries(data)
      .filter(([, value]) => value !== '' && value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');

    const paymentUrl = `${this.getBaseUrl()}/eng/process?${queryString}`;
    
    return paymentUrl;
  }

  async validateNotification(notificationData: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, string> }> {
    const signature = notificationData.signature;
    delete notificationData.signature;

    const expectedSignature = this.generateSignature(notificationData);

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    return { valid: true, data: notificationData };
  }

  getMerchantId(): string {
    return this.config.merchantId;
  }

  isConfigured(): boolean {
    return !!(this.config.merchantId && this.config.merchantKey);
  }
}

export const payfastService = new PayFastService();
