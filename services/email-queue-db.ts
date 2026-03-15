/**
 * Email Queue Database Service
 * 
 * Handles persistent email queue storage in Supabase.
 * Works with serverless functions (Vercel).
 */

import { createClient } from '@supabase/supabase-js';
import { emailService } from './email';

// Supabase client for serverless
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Email Queue DB: Supabase not configured');
    return null;
  }
  
  // Use connection pooler for serverless
  const poolerUrl = supabaseUrl?.includes('pgbouncer') 
    ? supabaseUrl 
    : supabaseUrl 
      ? `${supabaseUrl}${supabaseUrl.includes('?') ? '&' : '?'}pgbouncer=transaction`
      : undefined;
  
  return createClient(poolerUrl || supabaseUrl, supabaseKey);
}

// =============================================================================
// TYPES
// =============================================================================

export interface DbEmailQueueItem {
  id: string;
  email_type: string;
  recipient_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  text_body: string | null;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'sending' | 'sent' | 'failed';
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
}

export interface QueueEmailParams {
  emailType: string;
  recipientType?: 'client' | 'teacher' | 'admin';
  to: string;
  name?: string;
  subject?: string;
  body: string;
  textBody?: string;
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
}

// =============================================================================
// DATABASE FUNCTIONS
// =============================================================================

class EmailQueueDbService {
  private supabase = getSupabaseClient();

  /**
   * Add an email to the persistent queue
   */
  async enqueue(params: QueueEmailParams): Promise<string | null> {
    if (!this.supabase) {
      console.warn('⚠️ Email Queue DB: Cannot enqueue - Supabase not configured');
      return null;
    }

    const { data, error } = await this.supabase
      .from('email_queue')
      .insert({
        email_type: params.emailType,
        recipient_type: params.recipientType || 'client',
        recipient_email: params.to,
        recipient_name: params.name || null,
        subject: params.subject || null,
        body: params.body,
        text_body: params.textBody || null,
        priority: params.priority || 'normal',
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        next_retry_at: params.scheduledFor?.toISOString() || null,
        metadata: params.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Email Queue DB: Failed to enqueue email:', error);
      return null;
    }

    return data?.id || null;
  }

  /**
   * Get pending emails that are ready to send
   */
  async getPendingEmails(limit = 50): Promise<DbEmailQueueItem[]> {
    if (!this.supabase) {
      console.warn('⚠️ Email Queue DB: Cannot get pending - Supabase not configured');
      return [];
    }

    // Use the database function to get pending emails
    const { data, error } = await this.supabase
      .rpc('get_pending_emails', { p_limit: limit });

    if (error) {
      console.error('❌ Email Queue DB: Failed to get pending emails:', error);
      // Fallback to direct query
      const { data: fallback, error: fallbackError } = await this.supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(limit);
      
      if (fallbackError) {
        console.error('❌ Email Queue DB: Fallback query also failed:', fallbackError);
        return [];
      }
      
      return fallback || [];
    }

    return data || [];
  }

  /**
   * Mark email as sending (to prevent duplicate sends)
   */
  async markAsSending(id: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('email_queue')
      .update({ 
        status: 'sending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'pending'); // Only update if still pending

    return !error;
  }

  /**
   * Mark email as sent successfully
   */
  async markAsSent(id: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('email_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Mark email as failed with error message
   */
  async markAsFailed(id: string, errorMessage: string, attemptCount: number): Promise<boolean> {
    if (!this.supabase) return false;

    const maxAttempts = 3;
    const shouldRetry = attemptCount < maxAttempts;

    // Calculate next retry time based on attempt count
    const delays = [1, 5, 15]; // minutes
    const nextRetryMinutes = delays[Math.min(attemptCount, delays.length - 1)];
    const nextRetryAt = shouldRetry 
      ? new Date(Date.now() + nextRetryMinutes * 60 * 1000).toISOString()
      : null;

    const { error } = await this.supabase
      .from('email_queue')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        attempts: attemptCount,
        next_retry_at: nextRetryAt,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    sending: number;
    sent: number;
    failed: number;
  }> {
    if (!this.supabase) {
      return { pending: 0, sending: 0, sent: 0, failed: 0 };
    }

    const { data, error } = await this.supabase
      .from('email_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('❌ Email Queue DB: Failed to get stats:', error);
      return { pending: 0, sending: 0, sent: 0, failed: 0 };
    }

    const stats = { pending: 0, sending: 0, sent: 0, failed: 0 };
    for (const item of data || []) {
      if (item.status in stats) {
        stats[item.status as keyof typeof stats]++;
      }
    }

    return stats;
  }

  /**
   * Process pending emails (main worker function)
   */
  async processQueue(maxEmails = 20): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const results = { processed: 0, sent: 0, failed: 0 };

    // Get pending emails
    const pending = await this.getPendingEmails(maxEmails);

    for (const email of pending) {
      // Try to mark as sending (prevents duplicate processing)
      const locked = await this.markAsSending(email.id);
      if (!locked) continue; // Already being processed by another worker

      results.processed++;

      try {
        // Send the email
        const result = await emailService.sendEmail(
          email.recipient_email,
          email.subject || 'Email from Pause',
          email.body,
          email.text_body || undefined
        );

        if (result.success) {
          await this.markAsSent(email.id);
          results.sent++;
          console.log(`✅ Email sent: ${email.id} to ${email.recipient_email}`);
        } else {
          await this.markAsFailed(email.id, result.error || 'Unknown error', email.attempts + 1);
          results.failed++;
          console.error(`❌ Email failed: ${email.id} - ${result.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await this.markAsFailed(email.id, errorMsg, email.attempts + 1);
        results.failed++;
        console.error(`❌ Email exception: ${email.id} - ${errorMsg}`);
      }
    }

    return results;
  }
}

// Export singleton
export const emailQueueDb = new EmailQueueDbService();
export default emailQueueDb;
