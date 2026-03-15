/**
 * Email Queue Service
 * 
 * Handles email queuing, scheduling, and delivery for:
 * - Client emails (booking confirmations, reminders, waitlist)
 * - Teacher emails (schedule updates, new bookings)
 * - Admin emails (alerts, summaries, payment notifications)
 * 
 * Uses in-memory queue. Can be extended to use Redis when REDIS_URL is configured.
 */

import { emailService } from './email';
import type { Class, Registration, User, Teacher } from '../types';

// =============================================================================
// TYPES
// =============================================================================

// Email recipient types
export type EmailRecipientType = 'client' | 'teacher' | 'admin';

// Email priority levels
export type EmailPriority = 'high' | 'normal' | 'low';

// Queued email job
export interface QueuedEmail {
  id: string;
  type: EmailType;
  recipientType: EmailRecipientType;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  html: string;
  text?: string;
  priority: EmailPriority;
  scheduledFor?: string; // ISO timestamp for delayed sending
  metadata: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

// All email types for the booking system
export type EmailType = 
  // Client emails
  | 'client_booking_confirmation'
  | 'client_booking_cancelled'
  | 'client_class_reminder'
  | 'client_waitlist_available'
  | 'client_payment_received'
  | 'client_payment_required'
  | 'client_welcome'
  | 'client_feedback_request'
  | 'client_credit_purchase'
  | 'client_new_workshop'
  // Teacher emails  
  | 'teacher_class_assigned'
  | 'teacher_class_cancelled'
  | 'teacher_class_updated'
  | 'teacher_new_booking'
  | 'teacher_attendance_report'
  // Admin emails
  | 'admin_new_booking'
  | 'admin_booking_cancelled'
  | 'admin_payment_received'
  | 'admin_payment_required'
  | 'admin_waitlist_promoted'
  | 'admin_class_full'
  | 'admin_low_attendance'
  | 'admin_daily_summary'
  | 'admin_weekly_report';

// Email job data for creating jobs
export interface EmailJobData {
  type: EmailType;
  recipientType: EmailRecipientType;
  to: string;
  name: string;
  subject?: string;
  html?: string;
  text?: string;
  priority?: EmailPriority;
  scheduledFor?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Email retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS: number[] = [5000, 15000, 60000]; // 5s, 15s, 60s

/**
 * Get the configured admin email address.
 * Throws an error if ADMIN_EMAIL environment variable is not set.
 * This prevents sensitive admin notifications from being sent to incorrect recipients.
 * @throws Error if ADMIN_EMAIL is not configured
 */
function getAdminEmail(): string {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    const error = new Error('SECURITY: ADMIN_EMAIL environment variable is not configured. Admin emails cannot be sent.');
    console.error('🔴 Email Queue Security:', error.message);
    throw error;
  }
  return adminEmail;
}

// Scheduling offsets (in milliseconds)
const REMINDER_TIMES = {
  TWO_HOURS: 2 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000,
};

// =============================================================================
// IN-MEMORY QUEUE
// =============================================================================

// Priority queue for emails
const emailQueueArray: QueuedEmail[] = [];
// Scheduled emails (keyed by timestamp)
const scheduledEmails: Map<string, QueuedEmail[]> = new Map();
// Failed emails for debugging/retry
const failedEmails: QueuedEmail[] = [];

// =============================================================================
// EMAIL QUEUE SERVICE
// =============================================================================

class EmailQueueService {
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private sentCount = 0;
  private failedCount = 0;

  constructor() {
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Start the email processing loop
   */
  startProcessing(intervalMs = 5000) {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, intervalMs);
    
    console.log(`📧 Email Queue: Processing started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop the email processing loop
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
  }

  /**
   * Add an email to the queue
   */
  async enqueue(data: EmailJobData): Promise<string> {
    const job: QueuedEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: data.type,
      recipientType: data.recipientType,
      recipientEmail: data.to,
      recipientName: data.name,
      subject: data.subject || this.getDefaultSubject(data.type),
      html: data.html || '',
      text: data.text,
      priority: data.priority || 'normal',
      scheduledFor: data.scheduledFor,
      metadata: data.metadata || {},
      attempts: 0,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      createdAt: new Date().toISOString(),
    };

    if (data.scheduledFor) {
      // Add to scheduled queue
      const timestamp = data.scheduledFor;
      const existing = scheduledEmails.get(timestamp) || [];
      existing.push(job);
      scheduledEmails.set(timestamp, existing);
    } else {
      // Add to priority queue
      emailQueueArray.push(job);
      // Sort by priority
      emailQueueArray.sort((a, b) => {
        const priorityOrder: Record<EmailPriority, number> = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    }

    console.log(`📧 Email Queue: Enqueued ${data.type} email to ${data.to}`);
    return job.id;
  }

  /**
   * Process queued emails
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      
      // Get scheduled emails that are due
      const dueJobs = this.getDueScheduledEmails(now);
      
      // Get queued emails (up to 10 at a time)
      const queuedJobs = emailQueueArray.splice(0, 10);
      
      // Combine and process
      const allJobs = [...dueJobs, ...queuedJobs];
      
      for (const job of allJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Email Queue: Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get emails from scheduled set that are due
   */
  private getDueScheduledEmails(beforeTime: Date): QueuedEmail[] {
    const jobs: QueuedEmail[] = [];
    const now = beforeTime.getTime();
    
    for (const [timestamp, jobsArray] of scheduledEmails.entries()) {
      const jobTime = new Date(timestamp).getTime();
      if (jobTime <= now) {
        jobs.push(...jobsArray);
        scheduledEmails.delete(timestamp);
      }
    }
    
    return jobs;
  }

  /**
   * Process a single email job
   */
  private async processJob(job: QueuedEmail): Promise<void> {
    try {
      console.log(`📧 Email Queue: Processing ${job.type} to ${job.recipientEmail}`);
      
      const result = await emailService.sendEmail(
        job.recipientEmail,
        job.subject,
        job.html,
        job.text
      );

      if (result.success) {
        console.log(`✅ Email Queue: Sent ${job.type} to ${job.recipientEmail}`);
        this.sentCount++;
      } else {
        console.error(`❌ Email Queue: Failed to send ${job.type} to ${job.recipientEmail}:`, result.error);
        await this.handleFailure(job, result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`❌ Email Queue: Exception processing ${job.id}:`, error);
      await this.handleFailure(job, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle failed email - retry or move to dead letter queue
   */
  private async handleFailure(job: QueuedEmail, error: string): Promise<void> {
    job.attempts++;
    
    if (job.attempts < job.maxAttempts) {
      // Retry with delay
      const delay = RETRY_DELAYS[job.attempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      const retryAt = new Date(Date.now() + delay).toISOString();
      
      console.log(`📧 Email Queue: Scheduling retry ${job.attempts}/${job.maxAttempts} for ${job.id} at ${retryAt}`);
      
      await this.enqueue({
        type: job.type,
        recipientType: job.recipientType,
        to: job.recipientEmail,
        name: job.recipientName,
        subject: job.subject,
        html: job.html,
        text: job.text,
        priority: 'high',
        scheduledFor: retryAt,
        metadata: { ...job.metadata, retryAttempt: job.attempts, lastError: error }
      });
    } else {
      // Move to failed queue
      console.error(`📧 Email Queue: Moving ${job.id} to failed queue after ${job.attempts} attempts`);
      job.metadata = { ...job.metadata, failedAt: new Date().toISOString(), lastError: error };
      failedEmails.push(job);
      this.failedCount++;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queued: number;
    scheduled: number;
    failed: number;
    sent: number;
    isProcessing: boolean;
    provider: string;
  } {
    return {
      queued: emailQueueArray.length,
      scheduled: scheduledEmails.size,
      failed: failedEmails.length,
      sent: this.sentCount,
      isProcessing: this.isProcessing,
      provider: 'memory'
    };
  }

  /**
   * Get default subject line for email type
   */
  private getDefaultSubject(type: EmailType): string {
    const subjects: Record<EmailType, string> = {
      // Client emails
      client_booking_confirmation: 'You\'re Booked! 🧘',
      client_booking_cancelled: 'Booking Cancelled',
      client_class_reminder: 'Class Reminder 🔔',
      client_waitlist_available: 'Spot Available! 🎉',
      client_payment_received: 'Payment Confirmed 💳',
      client_payment_required: 'Payment Required',
      client_welcome: 'Welcome to Pause! 🧘',
      client_feedback_request: 'How was your class?',
      client_credit_purchase: 'Credits Added! 💳',
      client_new_workshop: 'New Workshop Available! 🎉',
      // Teacher emails
      teacher_class_assigned: 'New Class Assignment',
      teacher_class_cancelled: 'Class Cancelled',
      teacher_class_updated: 'Class Updated',
      teacher_new_booking: 'New Booking for Your Class',
      teacher_attendance_report: 'Class Attendance Report',
      // Admin emails
      admin_new_booking: 'New Booking Alert 📋',
      admin_booking_cancelled: 'Booking Cancelled',
      admin_payment_received: 'Payment Received 💰',
      admin_payment_required: 'Payment Required ⚠️',
      admin_waitlist_promoted: 'Waitlist Promoted',
      admin_class_full: 'Class Full Alert',
      admin_low_attendance: 'Low Attendance Warning',
      admin_daily_summary: 'Daily Summary',
      admin_weekly_report: 'Weekly Report',
    };
    
    return subjects[type] || 'Email from Pause';
  }

  /**
   * Retry all failed emails
   */
  retryFailed(): number {
    const count = failedEmails.length;
    
    for (const job of failedEmails) {
      job.attempts = 0;
      emailQueueArray.push(job);
    }
    failedEmails.length = 0;
    
    console.log(`📧 Email Queue: Requeued ${count} failed emails for retry`);
    return count;
  }
}

// Get templates from email service
const templates = emailService.getTemplates();

// =============================================================================
// EMAIL TRIGGER FUNCTIONS
// =============================================================================

/**
 * Send booking confirmation to client
 */
export async function sendClientBookingConfirmation(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'client_booking_confirmation',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    html: templates.bookingConfirmation({
      name: user.name,
      classTitle: cls.title,
      date: classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      venue: cls.venueId || 'TBC',
      price: cls.price
    }).html,
    metadata: { registrationId: registration.id, classId: cls.id }
  });
}

/**
 * Send class reminder to client
 */
export async function sendClientClassReminder(
  user: User,
  cls: Class,
  hoursUntil: number
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'client_class_reminder',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    html: templates.classReminder({
      name: user.name,
      classTitle: cls.title,
      date: classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      venue: cls.venueId || 'TBC',
      hoursUntil
    }).html,
    metadata: { classId: cls.id }
  });
}

/**
 * Send cancellation confirmation to client
 */
export async function sendClientCancellation(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'client_booking_cancelled',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    html: templates.cancellationConfirmation({
      name: user.name,
      classTitle: cls.title,
      date: classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    }).html,
    metadata: { registrationId: registration.id, classId: cls.id }
  });
}

/**
 * Send waitlist notification to client
 */
export async function sendClientWaitlistNotification(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'client_waitlist_available',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    html: templates.waitlistNotification({
      name: user.name,
      classTitle: cls.title,
      status: registration.status,
      date: classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      actionRequired: 'Please confirm your spot within 24 hours to avoid losing your place.'
    }).html,
    metadata: { registrationId: registration.id, classId: cls.id }
  });
}

/**
 * Send new booking notification to teacher
 */
export async function sendTeacherNewBooking(
  teacher: Teacher,
  cls: Class,
  registration: Registration
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'teacher_new_booking',
    recipientType: 'teacher',
    to: teacher.email,
    name: teacher.name,
    subject: `New Booking: ${cls.title}`,
    html: `
      <h2>New Booking for Your Class</h2>
      <p>Hi ${teacher.name},</p>
      <p>A new client has booked for your class:</p>
      <ul>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA')}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Client:</strong> ${registration.userName}</li>
        <li><strong>Current Bookings:</strong> ${cls.registered}/${cls.capacity}</li>
      </ul>
    `,
    metadata: { classId: cls.id, registrationId: registration.id }
  });
}

/**
 * Send class assignment notification to teacher
 */
export async function sendTeacherClassAssigned(
  teacher: Teacher,
  cls: Class
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'teacher_class_assigned',
    recipientType: 'teacher',
    to: teacher.email,
    name: teacher.name,
    subject: `You've been assigned: ${cls.title}`,
    html: `
      <h2>New Class Assignment</h2>
      <p>Hi ${teacher.name},</p>
      <p>You've been assigned to teach the following class:</p>
      <ul>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Duration:</strong> ${cls.duration} minutes</li>
        <li><strong>Venue:</strong> ${cls.venueId || 'TBC'}</li>
        <li><strong>Capacity:</strong> ${cls.capacity} students</li>
      </ul>
      <p>Please log in to view more details.</p>
    `,
    metadata: { classId: cls.id }
  });
}

/**
 * Send class cancellation notification to teacher
 */
export async function sendTeacherClassCancelled(
  teacher: Teacher,
  cls: Class
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'teacher_class_cancelled',
    recipientType: 'teacher',
    to: teacher.email,
    name: teacher.name,
    subject: `Class Cancelled: ${cls.title}`,
    html: `
      <h2>Class Cancelled</h2>
      <p>Hi ${teacher.name},</p>
      <p>The following class has been cancelled:</p>
      <ul>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
      </ul>
      <p>Please check your schedule for updates.</p>
    `,
    metadata: { classId: cls.id }
  });
}

/**
 * Send new booking alert to admin
 */
export async function sendAdminNewBooking(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'admin_new_booking',
    recipientType: 'admin',
    to: getAdminEmail(),
    name: 'Admin',
    subject: `New Booking: ${user.name} - ${cls.title}`,
    html: `
      <h2>New Booking Alert</h2>
      <p>A new booking has been made:</p>
      <ul>
        <li><strong>Client:</strong> ${user.name} (${user.email})</li>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA')}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Payment Status:</strong> ${registration.paymentStatus}</li>
        <li><strong>Price:</strong> R${cls.price}</li>
      </ul>
    `,
    priority: 'high',
    metadata: { registrationId: registration.id, classId: cls.id, userId: user.id }
  });
}

/**
 * Send cancellation alert to admin
 */
export async function sendAdminBookingCancelled(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'admin_booking_cancelled',
    recipientType: 'admin',
    to: getAdminEmail(),
    name: 'Admin',
    subject: `Booking Cancelled: ${user.name} - ${cls.title}`,
    html: `
      <h2>Booking Cancelled</h2>
      <p>A booking has been cancelled:</p>
      <ul>
        <li><strong>Client:</strong> ${user.name} (${user.email})</li>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA')}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Previous Status:</strong> ${registration.status}</li>
      </ul>
    `,
    priority: 'normal',
    metadata: { registrationId: registration.id, classId: cls.id, userId: user.id }
  });
}

/**
 * Send payment received notification to admin
 */
export async function sendAdminPaymentReceived(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  return emailQueue.enqueue({
    type: 'admin_payment_received',
    recipientType: 'admin',
    to: getAdminEmail(),
    name: 'Admin',
    subject: `Payment Received: ${user.name} - R${cls.price}`,
    html: `
      <h2>Payment Received</h2>
      <p>Payment has been received and verified:</p>
      <ul>
        <li><strong>Client:</strong> ${user.name} (${user.email})</li>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Amount:</strong> R${cls.price}</li>
        <li><strong>Payment Method:</strong> ${registration.paymentMethod || 'N/A'}</li>
      </ul>
      <p>The booking is now confirmed.</p>
    `,
    priority: 'high',
    metadata: { registrationId: registration.id, classId: cls.id, userId: user.id }
  });
}

/**
 * Send waitlist promotion alert to admin
 */
export async function sendAdminWaitlistPromoted(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  return emailQueue.enqueue({
    type: 'admin_waitlist_promoted',
    recipientType: 'admin',
    to: getAdminEmail(),
    name: 'Admin',
    subject: `Waitlist Promoted: ${user.name}`,
    html: `
      <h2>Waitlist Promoted</h2>
      <p>A waitlisted client has been promoted to confirmed:</p>
      <ul>
        <li><strong>Client:</strong> ${user.name} (${user.email})</li>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>New Status:</strong> ${registration.status}</li>
      </ul>
    `,
    metadata: { registrationId: registration.id, classId: cls.id, userId: user.id }
  });
}

/**
 * Send class full alert to admin
 */
export async function sendAdminClassFull(cls: Class): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'admin_class_full',
    recipientType: 'admin',
    to: getAdminEmail(),
    name: 'Admin',
    subject: `Class Full: ${cls.title}`,
    html: `
      <h2>Class Full Alert</h2>
      <p>A class has reached full capacity:</p>
      <ul>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA')}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Capacity:</strong> ${cls.capacity}/${cls.capacity} (FULL)</li>
      </ul>
    `,
    metadata: { classId: cls.id }
  });
}

/**
 * Send payment required notification to client
 */
export async function sendClientPaymentRequired(
  registration: Registration,
  cls: Class,
  user: User
): Promise<string> {
  const classDate = new Date(cls.dateTime);
  
  return emailQueue.enqueue({
    type: 'client_payment_required',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    subject: `Payment Required: ${cls.title}`,
    html: `
      <h2>Payment Required</h2>
      <p>Hi ${user.name},</p>
      <p>Your booking is confirmed but payment is still pending:</p>
      <ul>
        <li><strong>Class:</strong> ${cls.title}</li>
        <li><strong>Date:</strong> ${classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li><strong>Time:</strong> ${classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Amount Due:</strong> R${cls.price}</li>
      </ul>
      <p>Please complete your payment to secure your spot.</p>
    `,
    metadata: { registrationId: registration.id, classId: cls.id }
  });
}

/**
 * Schedule class reminders for all registered clients
 */
export async function scheduleClassReminders(
  cls: Class,
  registrations: Registration[],
  users: User[]
): Promise<void> {
  const classTime = new Date(cls.dateTime).getTime();
  const now = Date.now();
  
  // Schedule 24-hour reminder
  const reminder24h = classTime - REMINDER_TIMES.TWENTY_FOUR_HOURS;
  if (reminder24h > now) {
    for (const reg of registrations) {
      if (reg.status === 'confirmed') {
        const user = users.find(u => u.id === reg.userId);
        if (user) {
          await emailQueue.enqueue({
            type: 'client_class_reminder',
            recipientType: 'client',
            to: user.email,
            name: user.name,
            scheduledFor: new Date(reminder24h).toISOString(),
            html: templates.classReminder({
              name: user.name,
              classTitle: cls.title,
              date: new Date(cls.dateTime).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              time: new Date(cls.dateTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
              venue: cls.venueId || 'TBC',
              hoursUntil: 24
            }).html,
            metadata: { classId: cls.id, registrationId: reg.id }
          });
        }
      }
    }
  }
  
  // Schedule 2-hour reminder
  const reminder2h = classTime - REMINDER_TIMES.TWO_HOURS;
  if (reminder2h > now) {
    for (const reg of registrations) {
      if (reg.status === 'confirmed') {
        const user = users.find(u => u.id === reg.userId);
        if (user) {
          await emailQueue.enqueue({
            type: 'client_class_reminder',
            recipientType: 'client',
            to: user.email,
            name: user.name,
            scheduledFor: new Date(reminder2h).toISOString(),
            html: templates.classReminder({
              name: user.name,
              classTitle: cls.title,
              date: new Date(cls.dateTime).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              time: new Date(cls.dateTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
              venue: cls.venueId || 'TBC',
              hoursUntil: 2
            }).html,
            metadata: { classId: cls.id, registrationId: reg.id }
          });
        }
      }
    }
  }
  
  console.log(`📧 Email Queue: Scheduled ${registrations.length * 2} reminders for class ${cls.id}`);
}

/**
 * Send credit purchase confirmation to client
 */
export async function sendClientCreditPurchase(
  user: User,
  packageName: string,
  credits: number,
  bonusCredits: number,
  amount: number
): Promise<string> {
  const totalCredits = credits + bonusCredits;
  
  return emailQueue.enqueue({
    type: 'client_credit_purchase',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    subject: `Credits Added! 💳 ${totalCredits} credits ready`,
    html: templates.creditPurchaseConfirmation({
      name: user.name,
      packageName,
      credits,
      bonusCredits,
      amount,
      totalCredits
    }).html,
    priority: 'high',
    metadata: { userId: user.id, credits, amount }
  });
}

/**
 * Send new workshop notification to client
 */
export async function sendClientNewWorkshop(
  user: User,
  cls: Class,
  venueName?: string
): Promise<string> {
  const classDate = new Date(cls.dateTime || cls.date);
  
  return emailQueue.enqueue({
    type: 'client_new_workshop',
    recipientType: 'client',
    to: user.email,
    name: user.name,
    subject: `New Workshop! 🎉 ${cls.title}`,
    html: templates.newWorkshopNotification({
      name: user.name,
      classTitle: cls.title,
      date: classDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: cls.startTime || classDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      venue: venueName || 'TBC',
      price: cls.price || 0,
      description: cls.description,
      teacherName: cls.teacherName
    }).html,
    metadata: { classId: cls.id, userId: user.id }
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const emailQueue = new EmailQueueService();
export default emailQueue;
