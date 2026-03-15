/**
 * Supabase Database Types
 * TypeScript interfaces matching the schema in supabase/schema.sql
 */

// =============================================================================
// ENUMS
// =============================================================================

export type AdminRole = 'super_admin' | 'admin' | 'teacher' | 'staff' | 'teacher';
export type ClassStatus = 'published' | 'draft' | 'cancelled';
export type RegistrationStatus = 'confirmed' | 'registered' | 'cancelled' | 'waitlisted' | 'payment_review';
export type PaymentStatus = 'paid' | 'pending' | 'unpaid' | 'verified';
export type PaymentMethod = 'zapper' | 'manual' | 'free' | 'credits';
export type FeedbackType = 'post_class' | 'general' | 'nps';
export type MovementExperience = 'beginner' | 'intermediate' | 'advanced';
export type CalendarProvider = 'google' | 'apple' | 'outlook';

// =============================================================================
// USER TABLE
// =============================================================================

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_admin: boolean;
  admin_role: AdminRole | null;
  sport: string | null;
  waiver_accepted: boolean;
  medical_cleared: boolean;
  heat_acknowledged: boolean;
  waiver_date: string | null;
  credits: number;
  credit_batches: unknown[] | null; // JSON array of CreditBatch
  waiver_data: Record<string, unknown> | null;
  injuries: unknown[] | null;
  movement_goals: string[] | null;
  health_conditions: string[] | null;
  movement_experience: MovementExperience | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_backup_codes: string[] | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// VENUE TABLE
// =============================================================================

export interface VenueRow {
  id: string;
  name: string;
  address: string;
  suburb: string | null;
  maps_url: string | null;
  notes: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}


// =============================================================================
// DOMES TABLE (Locations)
// =============================================================================

export interface DomeRow {
  id: string;
  name: string;
  address: string;
  suburb: string | null;
  maps_url: string | null;
  notes: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// INSTRUCTOR TABLE
// =============================================================================

export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  specialties: string[] | null;
  avatar: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// CLASS TABLE
// =============================================================================

export interface ClassRow {
  id: string;
  slug: string;
  title: string;
  date_time: string;
  duration: number;
  dome_id: string | null;
  venue_id: string | null;
  teacher_id: string | null;
  sport_tags: string[] | null;
  body_area_tags: string[] | null;
  capacity: number;
  registered: number;
  status: ClassStatus;
  description: string | null;
  price: number;
  credit_cost: number;
  allow_dome_reset_override: boolean;
  // Workshop-specific fields
  class_type?: 'class' | 'workshop' | null;
  workshop_price?: number | null;
  custom_fields?: any[] | null;
  workshop_materials?: string[] | null;
  workshop_prerequisites?: string[] | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// REGISTRATION TABLE
// =============================================================================

export interface RegistrationRow {
  id: string;
  class_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_sport: string | null;
  body_areas: string[] | null;
  referred_by: string | null;
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  payment_proof: string | null;
  registered_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// TEMPLATE TABLE
// =============================================================================

export interface TemplateRow {
  id: string;
  name: string;
  sport_tags: string[] | null;
  body_area_tags: string[] | null;
  active: boolean;
  whatsapp_body: string | null;
  email_subject: string | null;
  email_body: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// FEEDBACK TABLE
// =============================================================================

export interface FeedbackRow {
  id: string;
  class_id: string | null;
  user_id: string;
  user_name: string;
  user_email: string | null;
  teacher_id: string | null;
  type: FeedbackType;
  rating: number | null;
  nps_score: number | null;
  comment: string | null;
  created_at: string;
}

// =============================================================================
// CALENDAR SYNC TABLE
// =============================================================================

export interface CalendarSyncRow {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  access_token: string;
  refresh_token: string | null;
  expiry_date: string | null;
  calendar_id: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// APP SETTINGS TABLE
// =============================================================================

export interface AppSettingsRow {
  id: number;
  app_name: string;
  contact_email: string;
  additional_contact_emails: string[] | null;
  zapper_qr_base64: string | null;
  landing_page: Record<string, unknown> | null;
  email_config: Record<string, unknown> | null;
  google_calendar_tokens: Record<string, unknown> | null;
  google_calendar_id: string | null;
  google_calendar_sync_enabled: boolean;
  google_calendar_last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisclaimerRow {
  id: string;
  name: string;
  context: string;
  class_type: string | null;
  dome_id: string | null;
  venue_id: string | null;
  title: string;
  intro_text: string;
  sections: Record<string, unknown> | null;
  signature_required: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// CREDIT PACKAGES TABLE
// =============================================================================

export interface CreditPackageRow {
  id: string;
  credits: number;
  price: number;
  bonus_credits: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// CHAT MESSAGES TABLE
// =============================================================================

export interface ChatMessageRow {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string | null;
  recipient_name: string | null;
  content: string;
  timestamp: string;
  read: boolean;
  created_at: string;
}

// =============================================================================
// MARKETING CAMPAIGNS TABLE
// =============================================================================

export interface MarketingCampaignRow {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  sent_at: string | null;
  sent: number;
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PROCESSED PAYMENTS TABLE (from payment_idempotency migration)
// =============================================================================

export interface ProcessedPaymentRow {
  id: string;
  payment_status: string;
  user_id: string | null;
  credit_package_id: string | null;
  credits_added: number | null;
  processed_at: string;
  ip_address: string | null;
  request_data: Record<string, unknown> | null;
}

// =============================================================================
// CREDIT PURCHASES TABLE
// =============================================================================

export interface CreditPurchaseRow {
  id: string;
  user_id: string;
  package_id: string;
  credits: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

// CRM Tables Row Types
export interface CRMContactRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string;
  is_client: boolean;
  movement_goals: string[] | null;
  primary_body_areas: string[] | null;
  injuries: string[] | null;
  health_conditions: string[] | null;
  total_sessions: number;
  preferred_class_types: string[] | null;
  package_history: string[] | null;
  total_spent: number;
  total_interactions: number;
  tags: string[] | null;
  notes: string | null;
  activities: string | null;
  created_at: string;
  updated_at: string;
  linked_user_id: string | null;
}

export interface CRMTaskRow {
  id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  priority: string;
  status: string;
  assigned_to: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  reminders: string | null;
  task_type: string | null;
}

export interface CRMPipelineStageRow {
  id: string;
  name: string;
  order: number;
  color: string;
  description: string | null;
}

export interface CRMEmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CRMCampaignRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  target_segment: string | null;
  target_tags: string[] | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  open_rate: number | null;
  click_rate: number | null;
  created_at: string;
  created_by: string;
}

// =============================================================================
// DATABASE INTERFACE (for Supabase client typing)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'created_at' | 'updated_at'> & Partial<Pick<UserRow, 'created_at' | 'updated_at'>>;
        Update: Partial<UserRow>;
      };
      venues: {
        Row: VenueRow;
        Insert: Omit<VenueRow, 'created_at' | 'updated_at'> & Partial<Pick<VenueRow, 'created_at' | 'updated_at'>>;
        Update: Partial<VenueRow>;
      };
      domes: {
        Row: DomeRow;
        Insert: Omit<DomeRow, 'created_at' | 'updated_at'> & Partial<Pick<DomeRow, 'created_at' | 'updated_at'>>;
        Update: Partial<DomeRow>;
      };
      teachers: {
        Row: TeacherRow;
        Insert: Omit<TeacherRow, 'created_at' | 'updated_at'> & Partial<Pick<TeacherRow, 'created_at' | 'updated_at'>>;
        Update: Partial<TeacherRow>;
      };
      classes: {
        Row: ClassRow;
        Insert: Omit<ClassRow, 'created_at' | 'updated_at'> & Partial<Pick<ClassRow, 'created_at' | 'updated_at'>>;
        Update: Partial<ClassRow>;
      };
      registrations: {
        Row: RegistrationRow;
        Insert: Omit<RegistrationRow, 'created_at' | 'updated_at'> & Partial<Pick<RegistrationRow, 'created_at' | 'updated_at'>>;
        Update: Partial<RegistrationRow>;
      };
      templates: {
        Row: TemplateRow;
        Insert: Omit<TemplateRow, 'created_at' | 'updated_at'> & Partial<Pick<TemplateRow, 'created_at' | 'updated_at'>>;
        Update: Partial<TemplateRow>;
      };
      feedback: {
        Row: FeedbackRow;
        Insert: Omit<FeedbackRow, 'created_at'> & Partial<Pick<FeedbackRow, 'created_at'>>;
        Update: Partial<FeedbackRow>;
      };
      calendar_sync: {
        Row: CalendarSyncRow;
        Insert: Omit<CalendarSyncRow, 'created_at' | 'updated_at'> & Partial<Pick<CalendarSyncRow, 'created_at' | 'updated_at'>>;
        Update: Partial<CalendarSyncRow>;
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Omit<AppSettingsRow, 'created_at' | 'updated_at'> & Partial<Pick<AppSettingsRow, 'created_at' | 'updated_at'>>;
        Update: Partial<AppSettingsRow>;
      };
      crm_contacts: {
        Row: CRMContactRow;
        Insert: Omit<CRMContactRow, 'created_at' | 'updated_at'> & Partial<Pick<CRMContactRow, 'created_at' | 'updated_at'>>;
        Update: Partial<CRMContactRow>;
      };
      crm_tasks: {
        Row: CRMTaskRow;
        Insert: Omit<CRMTaskRow, 'created_at'> & Partial<Pick<CRMTaskRow, 'created_at'>>;
        Update: Partial<CRMTaskRow>;
      };
      crm_pipeline_stages: {
        Row: CRMPipelineStageRow;
        Insert: CRMPipelineStageRow;
        Update: Partial<CRMPipelineStageRow>;
      };
      crm_email_templates: {
        Row: CRMEmailTemplateRow;
        Insert: Omit<CRMEmailTemplateRow, 'created_at' | 'updated_at'> & Partial<Pick<CRMEmailTemplateRow, 'created_at' | 'updated_at'>>;
        Update: Partial<CRMEmailTemplateRow>;
      };
      crm_campaigns: {
        Row: CRMCampaignRow;
        Insert: Omit<CRMCampaignRow, 'created_at'> & Partial<Pick<CRMCampaignRow, 'created_at'>>;
        Update: Partial<CRMCampaignRow>;
      };
      disclaimers: {
        Row: DisclaimerRow;
        Insert: Omit<DisclaimerRow, 'created_at' | 'updated_at'> & Partial<Pick<DisclaimerRow, 'created_at' | 'updated_at'>>;
        Update: Partial<DisclaimerRow>;
      };
      credit_packages: {
        Row: CreditPackageRow;
        Insert: Omit<CreditPackageRow, 'created_at' | 'updated_at'> & Partial<Pick<CreditPackageRow, 'created_at' | 'updated_at'>>;
        Update: Partial<CreditPackageRow>;
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: Omit<ChatMessageRow, 'created_at'> & Partial<Pick<ChatMessageRow, 'created_at'>>;
        Update: Partial<ChatMessageRow>;
      };
      marketing_campaigns: {
        Row: MarketingCampaignRow;
        Insert: Omit<MarketingCampaignRow, 'created_at' | 'updated_at'> & Partial<Pick<MarketingCampaignRow, 'created_at' | 'updated_at'>>;
        Update: Partial<MarketingCampaignRow>;
      };
      processed_payments: {
        Row: ProcessedPaymentRow;
        Insert: Omit<ProcessedPaymentRow, 'processed_at'> & Partial<Pick<ProcessedPaymentRow, 'processed_at'>>;
        Update: Partial<ProcessedPaymentRow>;
      };
      credit_purchases: {
        Row: CreditPurchaseRow;
        Insert: Omit<CreditPurchaseRow, 'created_at'> & Partial<Pick<CreditPurchaseRow, 'created_at'>>;
        Update: Partial<CreditPurchaseRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type SelectAll<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertInto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type TableName = keyof Database['public']['Tables'];
