
export interface Venue {
  id: string;
  name: string;
  address: string;
  suburb: string;
  mapsUrl: string;
  notes: string;
  capacity: number;
}

export interface Class {
  id: string;
  slug: string;
  title: string;
  dateTime: string;
  duration: number;
  venueId: string;
  teacherId?: string; // Assigned teacher
  instructorId?: string; // Alias for teacherId (for backward compatibility)
  sportTags: string[];
  bodyAreaTags: string[];
  capacity: number;
  registered: number;
  status: 'published' | 'draft' | 'cancelled';
  description: string;
  price: number; // 0 = free
  creditCost: number; // Cost in credits
  // Dome reset buffer - allow override for back-to-back classes
  allowDomeResetOverride?: boolean; // If true, bypasses 30-min reset requirement
  // Workshop-specific fields
  classType?: 'class' | 'workshop';
  customFields?: WorkshopCustomField[];
  workshopPrice?: number;
  workshopMaterials?: string[];
  workshopPrerequisites?: string[];
}

export interface WorkshopCustomField {
  id: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
}

// Teacher type
export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  specialties: string[]; // Sport tags they can teach
  avatar?: string;
  active: boolean;
}

// Alias for Teacher (used in data.ts)
export type Instructor = Teacher;

export interface Registration {
  id: string;
  classId: string;
  userId: string;
  userName: string;
  userEmail?: string; 
  userSport: string;
  bodyAreas: string[];
  referredBy: string | null;
  status: 'confirmed' | 'registered' | 'cancelled' | 'waitlisted' | 'payment_review';
  paymentStatus: 'paid' | 'pending' | 'unpaid' | 'verified'; 
  paymentMethod?: 'zapper' | 'manual' | 'free' | 'credits';
  paymentProof?: string; 
  registeredAt: string;
  notes?: string;
  injuries?: InjuryRecord[];
}

export interface Template {
  id: string;
  name: string;
  sportTags: string[];
  bodyAreaTags: string[];
  active: boolean;
  whatsappBody: string;
  emailSubject: string;
  emailBody: string;
}

export interface ReferralStat {
  userId: string;
  name: string;
  sport: string;
  totalReferrals: number;
  thisMonth: number;
  classesAttended: number;
}

export interface WaiverData {
  signed: boolean;
  signedAt: string;
  signerName: string;
  agreements: {
    medical: boolean;
    heat: boolean;
    liability: boolean;
  };
  ipAddress?: string; // Mocked
  userAgent?: string; // Mocked
}

// Admin role types
export type AdminRole = 'super_admin' | 'admin' | 'teacher' | 'staff';

export interface AdminPermissions {
  canManageClasses: boolean;
  canManageUsers: boolean;
  canManageAdmins: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canManageVenues: boolean;
  canManageTemplates: boolean;
  canProcessPayments: boolean;
}

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    canManageClasses: true,
    canManageUsers: true,
    canManageAdmins: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canManageVenues: true,
    canManageTemplates: true,
    canProcessPayments: true,
  },
  admin: {
    canManageClasses: true,
    canManageUsers: true,
    canManageAdmins: false,
    canViewAnalytics: true,
    canManageSettings: true,
    canManageVenues: true,
    canManageTemplates: true,
    canProcessPayments: true,
  },
  teacher: {
    canManageClasses: true,
    canManageUsers: false,
    canManageAdmins: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canManageVenues: false,
    canManageTemplates: false,
    canProcessPayments: false,
  },
  staff: {
    canManageClasses: false,
    canManageUsers: true,
    canManageAdmins: false,
    canViewAnalytics: true,
    canManageSettings: false,
    canManageVenues: false,
    canManageTemplates: false,
    canProcessPayments: true,
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin: boolean;
  adminRole?: AdminRole; // Role for admin users
  createdAt?: string; // Timestamp when user was created
  sport?: string;
  waiverData?: WaiverData;
  // Injury and health tracking
  injuries?: InjuryRecord[];
  healthConditions?: string[];
  movementExperience?: 'beginner' | 'intermediate' | 'advanced';
  // Legacy fields for backward compatibility if needed, but waiverData takes precedence
  waiverAccepted?: boolean; 
  medicalCleared?: boolean; 
  heatAcknowledged?: boolean; 
  waiverDate?: string; 
  credits?: number; // User's credit balance (optional with default 0)
  creditBatches?: CreditBatch[]; // Individual credit batches with expiration
  // Two-factor authentication
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  // Notification preferences
  classReminderOptIn?: boolean; // Opt-in for day-before class reminders
}

export interface FasciaEducationSection {
  id: string;
  title: string;
  content: string;
  icon: string;
}

export interface LandingPageConfig {
  headerText: string;
  subheaderText: string;
  expectations: string[];
  // Public landing page fields
  fasciaEducation: FasciaEducationSection[];
  heroCtaText: string;
  heroSubtext: string;
}

export interface EmailConfig {
  provider: 'mock' | 'sendgrid' | 'aws' | 'resend';
  apiKey: string;
  senderName: string;
  senderEmail: string;
  waitlistTemplate: string;
  // Configurable email templates
  templates?: EmailTemplatesConfig;
}

// Configurable email templates stored in settings
export interface EmailTemplatesConfig {
  // Client emails
  bookingConfirmation?: EmailTemplateConfig;
  classReminder?: EmailTemplateConfig;
  cancellationConfirmation?: EmailTemplateConfig;
  waitlistNotification?: EmailTemplateConfig;
  paymentVerification?: EmailTemplateConfig;
  welcomeEmail?: EmailTemplateConfig;
  paymentRequired?: EmailTemplateConfig;
  feedbackRequest?: EmailTemplateConfig;
  // Teacher emails
  teacherClassAssigned?: EmailTemplateConfig;
  teacherClassCancelled?: EmailTemplateConfig;
  teacherClassUpdated?: EmailTemplateConfig;
  teacherNewBooking?: EmailTemplateConfig;
  teacherAttendanceReport?: EmailTemplateConfig;
  // Admin emails
  adminNewBooking?: EmailTemplateConfig;
  adminBookingCancelled?: EmailTemplateConfig;
  adminPaymentReceived?: EmailTemplateConfig;
  adminPaymentRequired?: EmailTemplateConfig;
  adminWaitlistPromoted?: EmailTemplateConfig;
  adminClassFull?: EmailTemplateConfig;
  adminLowAttendance?: EmailTemplateConfig;
  adminDailySummary?: EmailTemplateConfig;
  adminWeeklyReport?: EmailTemplateConfig;
}

// Individual email template configuration
export interface EmailTemplateConfig {
  subject: string;
  body: string; // HTML or text template with {{variable}} placeholders
  enabled: boolean; // Whether to send this email type
}

// Google Calendar OAuth tokens
export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export interface AppSettings {
  zapperQrBase64?: string; // Admin uploaded QR code
  appName: string;
  contactEmail: string;
  additionalContactEmails?: string[]; // Additional admin contact emails
  landingPage: LandingPageConfig;
  email: EmailConfig;
  googleCalendarTokens?: GoogleCalendarTokens;
  googleCalendarId?: string; // Admin's Google Calendar ID
  googleCalendarSyncEnabled?: boolean; // Auto-sync classes to calendar
  googleCalendarLastSync?: string; // ISO timestamp of last sync
}

export type AppState = 'signin' | 'onboarding' | 'landing' | 'intake' | 'client' | 'admin' | 'teacher';

export type ClientTab = 'classes' | 'share' | 'bookings' | 'profile' | 'messages';
export type AdminSection = 'dashboard' | 'classes' | 'attendees' | 'templates' | 'venues' | 'settings' | 'landing_page' | 'analytics' | 'messages' | 'teachers' | 'crm' | 'feedback' | 'disclaimers' | 'my_classes' | 'schedule' | 'teachers';

// Analytics types
export interface ClientAnalytics {
  userId: string;
  userName: string;
  userEmail: string;
  totalBookings: number;
  attendedBookings: number;
  cancelledBookings: number;
  noShows: number;
  lastAttendance: string | null;
  firstBooking: string | null;
  retentionScore: number; // 0-100
  churnRisk: 'low' | 'medium' | 'high';
  favoriteClassType: string | null;
  averageBookingsPerMonth: number;
}

export interface AnalyticsData {
  totalClients: number;
  activeClients: number; // attended in last 30 days
  atRiskClients: number; // churn risk = high
  churnedClients: number; // no attendance in 60+ days
  averageRetentionRate: number;
  topClients: ClientAnalytics[];
  recentChurns: ClientAnalytics[];
}

// Recurring class types
export interface RecurringClassConfig {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  endDate: string;
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  excludeDates: string[];
}

// Chat types
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'admin';
  recipientId: string; // 'admin' for client-to-admin, or specific userId for admin-to-client
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

// =============== CRM Types ===============

// Client journey status for Fascia Studio
export type ClientStatus = 
  | 'new_inquiry'      // New lead interested in classes
  | 'consultation'     // Consultation booked/completed
  | 'trial'            // Trial class scheduled/done
  | 'active'           // Active member (has package/membership)
  | 'vip'              // VIP/long-term member
  | 'at_risk'          // Hasn't attended recently
  | 'churned';         // No longer active

// How they found us
export type ClientSource = 'website' | 'referral' | 'social' | 'event' | 'google' | 'instagram' | 'word_of_mouth' | 'other';

// Legacy type aliases for backward compatibility
export type LeadStatus = ClientStatus;
export type LeadSource = ClientSource;

// Body areas for fascia focus
export type BodyArea = 
  | 'hips' 
  | 'shoulders' 
  | 'spine' 
  | 'neck'
  | 'head'
  | 'lower_back' 
  | 'knees' 
  | 'ankles' 
  | 'wrists'
  | 'full_body';

// Contact/Client in Fascia Studio CRM
export interface CRMContact {
  id: string;
  // Basic Info
  name: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dateOfBirth?: string;
  // Additional info (for CRM purposes)
  company?: string;
  position?: string;
  
  // Client Journey Status
  status: ClientStatus;
  source: ClientSource;
  isClient: boolean; // Has attended at least one class
  
  // Movement & Health Profile
  primaryBodyAreas: BodyArea[];      // Areas they want to focus on
  injuries: InjuryRecord[];          // Current and past injuries
  healthConditions?: string[];       // E.g., pregnancy, recent surgery, chronic conditions
  movementExperience?: 'beginner' | 'intermediate' | 'advanced';
  
  // Session Tracking
  totalSessions: number;             // Total classes attended
  lastSessionDate?: string;
  nextSessionDate?: string;
  preferredTeacherId?: string;
  preferredClassTypes?: string[];     // E.g., ['Dome Session', 'Private', 'Group']
  
  // Package & Membership
  activePackage?: ClientPackage;
  packageHistory: ClientPackage[];
  totalSpent: number;                // Lifetime value
  
  // Engagement
  lastContactDate?: string;
  nextFollowUpDate?: string;
  followUpReason?: string;           // Why we need to follow up
  totalInteractions: number;
  
  // Sales Pipeline Fields (for CRM)
  estimatedValue?: number;           // Potential deal value
  actualValue?: number;              // Actual deal value
  
  // Tags & Notes
  tags: string[];                    // E.g., ['VIP', 'Corporate', 'Early Bird']
  notes: CRMNote[];
  activities: CRMActivity[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Link to existing user in main system
  linkedUserId?: string;
}

// Injury/health record
export interface InjuryRecord {
  id: string;
  area: BodyArea;
  injuryType?: 'sprain' | 'chronic_pain' | 'surgery' | 'fracture' | 'inflammation' | 'limited_mobility' | 'other';
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'recovered';
  dateOccurred?: string;
  dateRecovered?: string;
  notes?: string;
  modifications?: string;            // Movement modifications needed
}

// Client package/membership
export interface ClientPackage {
  id: string;
  name: string;                      // E.g., "10 Class Pack", "Monthly Unlimited"
  type: 'class_pack' | 'unlimited' | 'drop_in' | 'private';
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  purchaseDate: string;
  expiryDate?: string;
  price: number;
  isActive: boolean;
}

// Credit packages for purchase
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonusCredits?: number;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

// Credit batch - tracks purchased credits with expiration
export interface CreditBatch {
  id: string;
  userId: string;
  credits: number;
  remainingCredits: number;
  purchaseDate: string;
  expiryDate?: string;
  source: 'purchase' | 'bonus' | 'referral' | 'admin';
  isActive: boolean;
  packageId?: string; // Optional link to the package purchased
}

// Credit purchase record
export interface CreditPurchase {
  id: string;
  userId: string;
  packageId: string;
  credits: number;
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  payfastPaymentId?: string;
  payfastMPaymentId?: string;
  createdAt: string;
  completedAt?: string;
}

// Credit operation result from RPC functions
export interface CreditOperationResult {
  success: boolean;
  newBalance: number;
  error: string | null;
}

// Parameters for add_user_credits RPC function
export interface AddUserCreditsParams {
  userId: string;
  amount: number;
  reason?: string;
}

// Notes on contacts
export interface CRMNote {
  id: string;
  contactId: string;
  content: string;
  createdBy: string; // Admin user ID
  createdAt: string;
  isPinned: boolean;
  category?: 'general' | 'health' | 'progress' | 'preference' | 'admin';
}

// Activity log entries - tailored for Fascia Studio
export interface CRMActivity {
  id: string;
  contactId: string;
  type: 'session' | 'consultation' | 'call' | 'email' | 'whatsapp' | 'note' | 'status_change' | 'package_purchase' | 'package_renewal' | 'injury_update' | 'goal_achievement' | 'follow_up' | 'meeting' | 'other';
  title: string;
  description?: string;
  timestamp: string;
  createdBy: string;
  metadata?: {
    classId?: string;
    className?: string;
    teacherId?: string;
    teacherName?: string;
    packageId?: string;
    packageName?: string;
    oldStatus?: string;
    newStatus?: string;
    [key: string]: any;
  };
}

// Tasks/Follow-ups - tailored for studio
export interface CRMTask {
  id: string;
  contactId?: string; // Optional - can be general task
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string; // Admin user ID
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  reminders: TaskReminder[];
  // Studio-specific fields
  taskType?: 'follow_up' | 'consultation' | 'check_in' | 'renewal' | 'birthday' | 'injury_followup' | 'feedback';
}

// Task reminders
export interface TaskReminder {
  id: string;
  taskId: string;
  remindAt: string;
  type: 'email' | 'push' | 'sms';
  sent: boolean;
}

// Client Journey Pipeline Stage - tailored for Fascia Studio
export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  description?: string;
}

// Email Campaign
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  targetSegment?: string;
  targetTags?: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduledFor?: string;
  sentAt?: string;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  createdAt: string;
  createdBy: string;
}

// Email Template for CRM
export interface CRMEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'follow_up' | 'consultation' | 'welcome' | 'renewal' | 'check_in' | 'promotion' | 'other' | 'purchase' | 'booking' | 'class_reminder';
  variables: string[]; // e.g., ['name', 'className']
  createdAt: string;
  updatedAt: string;
}

// Dashboard metrics - tailored for Fascia Studio
export interface CRMMetrics {
  totalContacts: number;
  newLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  lostDeals: number;
  totalPipelineValue: number;
  conversionRate: number;
  avgDealSize: number;
  tasksDueToday: number;
  tasksOverdue: number;
  followUpsToday: number;
}

// Pipeline view data
export interface PipelineData {
  stage: PipelineStage;
  contacts: CRMContact[];
  value: number;
}

// Session attendance record for CRM integration
export interface SessionAttendance {
  id: string;
  contactId: string;
  classId: string;
  className: string;
  dateTime: string;
  teacherId?: string;
  teacherName?: string;
  status: 'attended' | 'no_show' | 'cancelled';
  notes?: string;
  packageUsed?: string;            // Which package was used
}

// Progress tracking for movement goals
export interface ProgressEntry {
  id: string;
  contactId: string;
  date: string;
  bodyArea?: BodyArea;
  progress: number;                // 1-10 scale or percentage
  notes?: string;
  recordedBy: string;              // Admin/Teacher ID
}

// =============== Feedback Types ===============

export type FeedbackType = 'post_class' | 'general' | 'nps';

export interface Feedback {
  id: string;
  classId?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  teacherId?: string;
  type: FeedbackType;
  rating?: number; // 1-5 stars
  npsScore?: number; // 0-10 NPS
  comment?: string;
  createdAt: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  averageNps: number;
  ratingDistribution: Record<number, number>; // 1-5 stars count
  npsDistribution: {
    detractor: number;   // 0-6
    passive: number;      // 7-8
    promoter: number;     // 9-10
  };
}

// =============== Disclaimer Types ===============

export type DisclaimerContext = 'general' | 'class' | 'venue' | 'waiver' | 'registration';

export interface Disclaimer {
  id: string;
  name: string; // Display name for admin
  context: DisclaimerContext; // Where this disclaimer is shown
  // Context-specific identifiers (optional)
  classType?: string; // e.g., "Dome Session", "Private"
  venueId?: string;   // Specific venue ID
  // Content sections
  title: string;
  introText: string; // Welcome/introduction text
  sections: DisclaimerSection[];
  signatureRequired: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisclaimerSection {
  id: string;
  title: string;
  content: string; // The actual disclaimer text
  order: number;
  required: boolean; // Must be accepted
}
