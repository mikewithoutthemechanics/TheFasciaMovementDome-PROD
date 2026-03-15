import { Resend } from 'resend';
import type { EmailTemplatesConfig } from '../types';

// ============================================
// Email Service Configuration
// ============================================

// Email provider types
export type EmailProvider = 'mock' | 'resend';

// Email type definitions
export type EmailType = 
  | 'booking_confirmation'
  | 'class_reminder'
  | 'waitlist_notification'
  | 'payment_verification'
  | 'cancellation_confirmation'
  | 'welcome_email'
  | 'credit_purchase_confirmation'
  | 'new_workshop_notification'
  | 'feedback_notification';

// Email send result
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email data interface
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Email templates interface
export interface EmailTemplates {
  bookingConfirmation: (data: BookingConfirmationData) => { subject: string; html: string; text: string };
  classReminder: (data: ClassReminderData) => { subject: string; html: string; text: string };
  waitlistNotification: (data: WaitlistNotificationData) => { subject: string; html: string; text: string };
  paymentVerification: (data: PaymentVerificationData) => { subject: string; html: string; text: string };
  cancellationConfirmation: (data: CancellationConfirmationData) => { subject: string; html: string; text: string };
  welcomeEmail: (data: WelcomeEmailData) => { subject: string; html: string; text: string };
  creditPurchaseConfirmation: (data: CreditPurchaseData) => { subject: string; html: string; text: string };
  newWorkshopNotification: (data: NewWorkshopData) => { subject: string; html: string; text: string };
  feedbackNotification: (data: FeedbackNotificationData) => { subject: string; html: string; text: string };
}

// Template data types
export interface BookingConfirmationData {
  name: string;
  classTitle: string;
  date: string;
  time: string;
  venue: string;
  price: number;
}

export interface ClassReminderData {
  name: string;
  classTitle: string;
  date: string;
  time: string;
  venue: string;
  hoursUntil: number;
}

export interface WaitlistNotificationData {
  name: string;
  classTitle: string;
  status: string;
  date: string;
  time: string;
  actionRequired?: string;
}

export interface PaymentVerificationData {
  name: string;
  classTitle: string;
  amount: number;
  paymentMethod: string;
}

export interface CancellationConfirmationData {
  name: string;
  classTitle: string;
  date: string;
  time: string;
}

export interface WelcomeEmailData {
  name: string;
  referralCode?: string;
}

export interface CreditPurchaseData {
  name: string;
  packageName: string;
  credits: number;
  bonusCredits: number;
  amount: number;
  totalCredits: number;
}

export interface NewWorkshopData {
  name: string;
  classTitle: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  description?: string;
  teacherName?: string;
}

export interface FeedbackNotificationData {
  teacherName: string;
  studentName: string;
  classTitle?: string;
  rating?: number;
  npsScore?: number;
  comment?: string;
  feedbackType: string;
}

// ============================================
// Email Service Class
// ============================================

class EmailService {
  private resend: Resend | null = null;
  private provider: EmailProvider = 'mock';
  private senderName: string = 'Pause Admin';
  private senderEmail: string = 'hello@pausefmd.co.za';
  private customTemplates: EmailTemplatesConfig | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.provider = 'resend';
      console.log('✅ Email service initialized with Resend');
    } else {
      this.provider = 'mock';
      console.log('📧 Email service initialized in MOCK mode (console.log)');
    }

    // Load sender config from environment or settings
    this.senderName = process.env.EMAIL_SENDER_NAME || this.senderName;
    this.senderEmail = process.env.EMAIL_SENDER_EMAIL || this.senderEmail;
  }

  getProvider(): EmailProvider {
    return this.provider;
  }

  setSender(name: string, email: string) {
    this.senderName = name;
    this.senderEmail = email;
  }

  /**
   * Set custom email templates from admin settings
   * Templates are merged with defaults - missing templates use defaults
   */
  setTemplates(templates: EmailTemplatesConfig) {
    this.customTemplates = templates;
    console.log('📧 Email service: Custom templates loaded');
  }

  /**
   * Get custom templates
   */
  getCustomTemplates(): EmailTemplatesConfig | null {
    return this.customTemplates;
  }

  /**
   * Check if a specific template is enabled
   */
  isTemplateEnabled(templateKey: keyof EmailTemplatesConfig): boolean {
    if (!this.customTemplates) return true; // Default to enabled
    const template = this.customTemplates[templateKey];
    return template?.enabled ?? true;
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
    if (this.provider === 'mock' || !this.resend) {
      return this.mockSend(to, subject, html, text);
    }

    try {
      const result = await this.resend.emails.send({
        from: `${this.senderName} <${this.senderEmail}>`,
        to: [to],
        subject: subject,
        html: html,
        text: text,
      });

      if (result.error) {
        console.error('Resend error:', result.error);
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private mockSend(to: string, subject: string, html: string, text?: string): EmailResult {
    console.group('%c 📧 Email Service (MOCK)', 'background: #222; color: #bada55; font-size: 12px; padding: 4px; border-radius: 4px;');
    console.log(`%cTo: %c${to}`, 'font-weight: bold; color: #666;', 'color: #333;');
    console.log(`%cFrom: %c${this.senderName} <${this.senderEmail}>`, 'font-weight: bold; color: #666;', 'color: #333;');
    console.log(`%cSubject: %c${subject}`, 'font-weight: bold; color: #666;', 'color: #333;');
    console.log(`%cBody:`, 'font-weight: bold; color: #666;');
    console.log(`%c${text || html.replace(/<[^>]*>/g, '')}`, 'color: #444; font-style: italic;');
    console.groupEnd();
    
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  // ============================================
  // Email Type Specific Methods
  // ============================================

  async sendBookingConfirmation(data: BookingConfirmationData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.bookingConfirmation(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendClassReminder(data: ClassReminderData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.classReminder(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendWaitlistNotification(data: WaitlistNotificationData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.waitlistNotification(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendPaymentVerification(data: PaymentVerificationData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.paymentVerification(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendCancellationConfirmation(data: CancellationConfirmationData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.cancellationConfirmation(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendWelcomeEmail(data: WelcomeEmailData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.welcomeEmail(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendCreditPurchaseConfirmation(data: CreditPurchaseData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.creditPurchaseConfirmation(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendNewWorkshopNotification(data: NewWorkshopData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.newWorkshopNotification(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  async sendFeedbackNotification(data: FeedbackNotificationData & { to: string }): Promise<EmailResult> {
    const { to, ...templateData } = data;
    const { subject, html, text } = this.templates.feedbackNotification(templateData);
    return this.sendEmail(to, subject, html, text);
  }

  // ============================================
  // Email Templates
  // ============================================

  // ============================================
  // Email Templates - PUBLIC ACCESS
  // ============================================

  // Expose templates publicly for use by email queue service
  getTemplates() {
    // If custom templates exist, merge them with defaults
    if (this.customTemplates) {
      return this.getMergedTemplates();
    }
    return this.templates;
  }

  /**
   * Get merged templates (custom + defaults)
   */
  private getMergedTemplates(): EmailTemplates {
    const custom = this.customTemplates;
    
    return {
      bookingConfirmation: custom?.bookingConfirmation?.enabled !== false 
        ? this.createTemplateFn('bookingConfirmation', custom?.bookingConfirmation)
        : this.templates.bookingConfirmation,
      classReminder: custom?.classReminder?.enabled !== false
        ? this.createTemplateFn('classReminder', custom?.classReminder)
        : this.templates.classReminder,
      waitlistNotification: custom?.waitlistNotification?.enabled !== false
        ? this.createTemplateFn('waitlistNotification', custom?.waitlistNotification)
        : this.templates.waitlistNotification,
      paymentVerification: custom?.paymentVerification?.enabled !== false
        ? this.createTemplateFn('paymentVerification', custom?.paymentVerification)
        : this.templates.paymentVerification,
      cancellationConfirmation: custom?.cancellationConfirmation?.enabled !== false
        ? this.createTemplateFn('cancellationConfirmation', custom?.cancellationConfirmation)
        : this.templates.cancellationConfirmation,
      welcomeEmail: custom?.welcomeEmail?.enabled !== false
        ? this.createTemplateFn('welcomeEmail', custom?.welcomeEmail)
        : this.templates.welcomeEmail,
      creditPurchaseConfirmation: this.templates.creditPurchaseConfirmation,
      newWorkshopNotification: this.templates.newWorkshopNotification,
      feedbackNotification: this.templates.feedbackNotification,
    };
  }

  /**
   * Create a template function from custom config
   */
  private createTemplateFn(
    type: keyof typeof this.templates,
    config?: EmailTemplatesConfig[keyof EmailTemplatesConfig]
  ): any {
    if (!config?.subject && !config?.body) {
      return this.templates[type];
    }
    
    return (data: any) => {
      let subject = config.subject || this.templates[type](data).subject;
      let body = config.body || this.templates[type](data).html;
      
      // Replace template variables {{variable}}
      subject = this.replaceVariables(subject, data);
      body = this.replaceVariables(body, data);
      
      return {
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, ''),
      };
    };
  }

  /**
   * Replace template variables {{variable}} with actual data
   */
  private replaceVariables(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private templates: EmailTemplates = {
    bookingConfirmation: (data) => ({
      subject: `You're booked! 🧘 ${data.classTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Booked! 🧘</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">See you in the Dome</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #667eea;">${data.classTitle}</h2>
            <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${data.time}</p>
            <p style="margin: 8px 0;"><strong>📍 Venue:</strong> ${data.venue}</p>
            ${data.price > 0 ? `<p style="margin: 8px 0;"><strong>💰 Price:</strong> R${data.price}</p>` : ''}
          </div>

          <p>Hi ${data.name},</p>
          <p>Your spot is confirmed! Get ready to explore the fascial chains in your body and discover new movement possibilities.</p>
          <p><strong>What to bring:</strong></p>
          <ul>
            <li>Comfortable clothing</li>
            <li>Water bottle</li>
            <li>Open mind</li>
          </ul>
          <p>We look forward to moving with you!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Questions? Reply to this email or WhatsApp us.</p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `You're booked! 🧘 ${data.classTitle}

Hi ${data.name},

Your spot is confirmed for ${data.classTitle}!

Date: ${data.date}
Time: ${data.time}
Venue: ${data.venue}
${data.price > 0 ? `Price: R${data.price}` : ''}

Get ready to explore the fascial chains in your body and discover new movement possibilities.

What to bring:
- Comfortable clothing
- Water bottle
- Open mind

We look forward to moving with you!

Questions? Reply to this email.
© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    classReminder: (data) => ({
      subject: `Reminder: ${data.classTitle} is in ${data.hoursUntil} hours! 🔔`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">See you soon! 🔔</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Class reminder</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #f5576c;">${data.classTitle}</h2>
            <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${data.time}</p>
            <p style="margin: 8px 0;"><strong>📍 Venue:</strong> ${data.venue}</p>
          </div>

          <p>Hi ${data.name},</p>
          <p>Just a friendly reminder that your class is coming up in <strong>${data.hoursUntil} hours</strong>!</p>
          <p>We're excited to move with you. Come ready to release tension and discover new pathways in your body.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Need to cancel? Do it at least 24 hours before class.</p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `Reminder: ${data.classTitle} is in ${data.hoursUntil} hours! 🔔

Hi ${data.name},

Just a friendly reminder that your class is coming up!

Date: ${data.date}
Time: ${data.time}
Venue: ${data.venue}

We're excited to move with you. Come ready to release tension and discover new pathways in your body.

Need to cancel? Do it at least 24 hours before class.

© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    waitlistNotification: (data) => ({
      subject: `You're off the waitlist! 🎉 ${data.classTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're off the waitlist! 🎉</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A spot has opened up</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #11998e;">${data.classTitle}</h2>
            <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${data.time}</p>
            <p style="margin: 8px 0;"><strong>📊 Status:</strong> ${data.status}</p>
          </div>

          <p>Hi ${data.name},</p>
          <p>Great news! A spot has opened up and you've been moved from the waitlist!</p>
          ${data.actionRequired ? `<p><strong>${data.actionRequired}</strong></p>` : ''}
          <p>Don't wait too long - spots fill up fast!</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="background: #11998e; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; display: inline-block;">Confirm Your Spot</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `You're off the waitlist! 🎉 ${data.classTitle}

Hi ${data.name},

Great news! A spot has opened up and you've been moved from the waitlist!

Date: ${data.date}
Time: ${data.time}
Status: ${data.status}
${data.actionRequired ? `\n${data.actionRequired}` : ''}

Don't wait too long - spots fill up fast!

© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    paymentVerification: (data) => ({
      subject: `Payment Verified! 💳 ${data.classTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Verified! 💳</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You're all set</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #4facfe;">${data.classTitle}</h2>
            <p style="margin: 8px 0;"><strong>💰 Amount:</strong> R${data.amount}</p>
            <p style="margin: 8px 0;"><strong>💳 Method:</strong> ${data.paymentMethod}</p>
          </div>

          <p>Hi ${data.name},</p>
          <p>We've verified your payment and your booking is now confirmed!</p>
          <p>Get ready to experience the transformative power of fascia movement.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Questions? Reply to this email.</p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `Payment Verified! 💳 ${data.classTitle}

Hi ${data.name},

We've verified your payment and your booking is now confirmed!

Class: ${data.classTitle}
Amount: R${data.amount}
Method: ${data.paymentMethod}

Get ready to experience the transformative power of fascia movement.

Questions? Reply to this email.
© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    cancellationConfirmation: (data) => ({
      subject: `Booking Cancelled 😔 ${data.classTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Booking Cancelled 😔</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">We'll miss you!</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #667eea;">${data.classTitle}</h2>
            <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${data.time}</p>
          </div>

          <p>Hi ${data.name},</p>
          <p>Your booking has been cancelled. We're sorry we won't be moving with you this time!</p>
          <p>Whenever you're ready, we'd love to welcome you to the Dome. Check out our upcoming classes and book when the time is right.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Questions? Reply to this email.</p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `Booking Cancelled 😔 ${data.classTitle}

Hi ${data.name},

Your booking has been cancelled. We're sorry we won't be moving with you this time!

Date: ${data.date}
Time: ${data.time}

Whenever you're ready, we'd love to welcome you to the Dome. Check out our upcoming classes and book when the time is right.

Questions? Reply to this email.
© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    welcomeEmail: (data) => ({
      subject: `Welcome to Pause! 🧘 Let's get you moving`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to Pause! 🧘</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">The Fascia Movement Dome</p>
          </div>

          <p>Hi ${data.name},</p>
          <p>Welcome to the Pause community! We're thrilled to have you join us on this journey of fascia exploration and movement discovery.</p>
          
          <h2 style="color: #667eea;">What is Fascia Movement?</h2>
          <p>Fascia is the connective tissue that surrounds every muscle, bone, and nerve in your body. By working with your fascia, you can:</p>
          <ul>
            <li>Release chronic tension and pain</li>
            <li>Improve flexibility and mobility</li>
            <li>Enhance athletic performance</li>
            <li>Discover new movement possibilities</li>
          </ul>
          
          <h2 style="color: #667eea;">What to Expect</h2>
          <p>Our sessions are designed to help you connect with your body's fascial network through gentle, intentional movements. You'll learn techniques you can use forever to keep your fascia healthy and fluid.</p>
          
          ${data.referralCode ? `
          <div style="background: #f0f7ff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-weight: bold; color: #667eea;">Your Referral Code</p>
            <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">${data.referralCode}</p>
            <p style="margin: 10px 0 0 0; color: #666;">Share with friends - you both get R50 off!</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="background: #667eea; color: white; padding: 14px 30px; border-radius: 25px; text-decoration: none; display: inline-block; font-weight: bold;">Browse Upcoming Classes</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Questions? Just reply to this email - we'd love to hear from you!</p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Pause! 🧘 Let's get you moving

Hi ${data.name},

Welcome to the Pause community! We're thrilled to have you join us on this journey of fascia exploration and movement discovery.

What is Fascia Movement?
Fascia is the connective tissue that surrounds every muscle, bone, and nerve in your body. By working with your fascia, you can:
- Release chronic tension and pain
- Improve flexibility and mobility
- Enhance athletic performance
- Discover new movement possibilities

What to Expect
Our sessions are designed to help you connect with your body's fascial network through gentle, intentional movements. You'll learn techniques you can use forever to keep your fascia healthy and fluid.

${data.referralCode ? `Your Referral Code: ${data.referralCode}\nShare with friends - you both get R50 off!\n` : ''}
Browse upcoming classes at our website.

Questions? Just reply to this email - we'd love to hear from you!

© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    creditPurchaseConfirmation: (data) => ({
      subject: `Credits Added! 💳 ${data.totalCredits} credits ready to use`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Credits Added! 💳</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Ready to book your next session</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">Total Credits Added</p>
            <p style="font-size: 48px; font-weight: bold; color: #11998e; margin: 10px 0;">${data.totalCredits}</p>
            ${data.bonusCredits > 0 ? `<p style="margin: 0; color: #38ef7d; font-size: 14px;">Includes ${data.bonusCredits} bonus credits!</p>` : ''}
          </div>

          <p>Hi ${data.name},</p>
          <p>Your payment was successful and <strong>${data.totalCredits} credits</strong> have been added to your account!</p>
          
          <div style="background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e5e5;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Purchase Details</h3>
            <p style="margin: 8px 0;"><strong>Package:</strong> ${data.packageName}</p>
            <p style="margin: 8px 0;"><strong>Base Credits:</strong> ${data.credits}</p>
            ${data.bonusCredits > 0 ? `<p style="margin: 8px 0;"><strong>Bonus Credits:</strong> ${data.bonusCredits}</p>` : ''}
            <p style="margin: 8px 0;"><strong>Amount Paid:</strong> R${data.amount}</p>
            <p style="margin: 8px 0;"><strong>Total Credits:</strong> ${data.totalCredits}</p>
          </div>

          <p>You're all set to book your next fascia movement session. Use your credits to reserve your spot in any upcoming class.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="background: #11998e; color: white; padding: 14px 30px; border-radius: 25px; text-decoration: none; display: inline-block; font-weight: bold;">Browse Classes</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Questions? Reply to this email or WhatsApp us.</p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `Credits Added! 💳 ${data.totalCredits} credits ready to use

Hi ${data.name},

Your payment was successful and ${data.totalCredits} credits have been added to your account!

Purchase Details:
- Package: ${data.packageName}
- Base Credits: ${data.credits}
${data.bonusCredits > 0 ? `- Bonus Credits: ${data.bonusCredits}\n` : ''}- Amount Paid: R${data.amount}
- Total Credits: ${data.totalCredits}

You're all set to book your next fascia movement session. Use your credits to reserve your spot in any upcoming class.

Browse classes at our website.

Questions? Reply to this email or WhatsApp us.
© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    newWorkshopNotification: (data) => ({
      subject: `New Workshop! 🎉 ${data.classTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Workshop Alert! 🎉</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Something special is coming</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #f5576c;">${data.classTitle}</h2>
            <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${data.time}</p>
            <p style="margin: 8px 0;"><strong>📍 Venue:</strong> ${data.venue}</p>
            ${data.teacherName ? `<p style="margin: 8px 0;"><strong>👤 Teacher:</strong> ${data.teacherName}</p>` : ''}
            ${data.price > 0 ? `<p style="margin: 8px 0;"><strong>💰 Price:</strong> R${data.price}</p>` : '<p style="margin: 8px 0;"><strong>💰 Price:</strong> Free</p>'}
          </div>

          <p>Hi ${data.name},</p>
          <p>We're excited to announce a new workshop! ${data.description || 'Join us for an immersive fascia movement experience.'}</p>
          
          <p>Spots fill up quickly, so book early to secure your place!</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="background: #f5576c; color: white; padding: 14px 30px; border-radius: 25px; text-decoration: none; display: inline-block; font-weight: bold;">Book Your Spot</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>Don't want these notifications? <a href="#" style="color: #888;">Unsubscribe</a></p>
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `New Workshop! 🎉 ${data.classTitle}

Hi ${data.name},

We're excited to announce a new workshop!

${data.classTitle}
📅 Date: ${data.date}
⏰ Time: ${data.time}
📍 Venue: ${data.venue}
${data.teacherName ? `👤 Teacher: ${data.teacherName}\n` : ''}💰 Price: ${data.price > 0 ? `R${data.price}` : 'Free'}

${data.description || 'Join us for an immersive fascia movement experience.'}

Spots fill up quickly, so book early to secure your place!

Book your spot at our website.

© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    }),

    feedbackNotification: (data) => ({
      subject: `New Feedback from ${data.studentName}${data.classTitle ? ` - ${data.classTitle}` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Feedback Received! 💬</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">From ${data.studentName}</p>
          </div>
          
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 8px 0;"><strong>📝 Type:</strong> ${data.feedbackType === 'post_class' ? 'Post-Class Feedback' : data.feedbackType === 'nps' ? 'NPS Survey' : 'General Feedback'}</p>
            ${data.classTitle ? `<p style="margin: 8px 0;"><strong>🧘 Class:</strong> ${data.classTitle}</p>` : ''}
            ${data.rating ? `<p style="margin: 8px 0;"><strong>⭐ Rating:</strong> ${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)} (${data.rating}/5)</p>` : ''}
            ${data.npsScore !== undefined ? `<p style="margin: 8px 0;"><strong>📊 NPS Score:</strong> <span style="display: inline-block; width: 30px; height: 30px; line-height: 30px; text-align: center; border-radius: 50%; background: ${data.npsScore >= 9 ? '#22c55e' : data.npsScore >= 7 ? '#eab308' : '#ef4444'}; color: white; font-weight: bold;">${data.npsScore}</span></p>` : ''}
          </div>

          ${data.comment ? `
          <div style="background: #fff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-style: italic; color: #555;">"${data.comment}"</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Pause - The Fascia Movement Dome</p>
          </div>
        </body>
        </html>
      `,
      text: `New Feedback from ${data.studentName}${data.classTitle ? ` - ${data.classTitle}` : ''}

Type: ${data.feedbackType === 'post_class' ? 'Post-Class Feedback' : data.feedbackType === 'nps' ? 'NPS Survey' : 'General Feedback'}
${data.classTitle ? `Class: ${data.classTitle}` : ''}
${data.rating ? `Rating: ${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)} (${data.rating}/5)` : ''}
${data.npsScore !== undefined ? `NPS Score: ${data.npsScore}` : ''}
${data.comment ? `\nComment: "${data.comment}"` : ''}

© ${new Date().getFullYear()} Pause - The Fascia Movement Dome`
    })
  };
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
