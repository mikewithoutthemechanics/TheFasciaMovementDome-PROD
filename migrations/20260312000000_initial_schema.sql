-- =============================================================================
-- INITIAL SCHEMA MIGRATION
-- Created: 2026-03-12
-- Based on: services/supabase-types.ts
-- =============================================================================

BEGIN;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'teacher', 'staff');
CREATE TYPE class_status AS ENUM ('published', 'draft', 'cancelled');
CREATE TYPE registration_status AS ENUM ('confirmed', 'registered', 'cancelled', 'waitlisted', 'payment_review');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'unpaid', 'verified');
CREATE TYPE payment_method AS ENUM ('zapper', 'manual', 'free', 'credits');
CREATE TYPE feedback_type AS ENUM ('post_class', 'general', 'nps');
CREATE TYPE movement_experience AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE calendar_provider AS ENUM ('google', 'apple', 'outlook');

-- =============================================================================
-- 1. USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    is_admin BOOLEAN DEFAULT false,
    admin_role admin_role,
    sport TEXT,
    waiver_accepted BOOLEAN DEFAULT false,
    medical_cleared BOOLEAN DEFAULT false,
    heat_acknowledged BOOLEAN DEFAULT false,
    waiver_date TIMESTAMPTZ,
    credits INTEGER DEFAULT 0,
    credit_batches JSONB DEFAULT '[]'::jsonb,
    waiver_data JSONB,
    injuries JSONB DEFAULT '[]'::jsonb,
    movement_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
    health_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    movement_experience movement_experience,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    two_factor_backup_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage users"
    ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read all (for admin checks)
CREATE POLICY "Authenticated users can read all users"
    ON users FOR SELECT TO authenticated USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE USING (auth.uid()::text = id);

-- =============================================================================
-- 2. VENUES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    suburb TEXT,
    maps_url TEXT,
    notes TEXT,
    capacity INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage venues"
    ON venues FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active venues
CREATE POLICY "Public can read active venues"
    ON venues FOR SELECT USING (active = true);

-- Authenticated users can read all venues
CREATE POLICY "Authenticated can read all venues"
    ON venues FOR SELECT TO authenticated USING (true);

-- Admins can manage venues
CREATE POLICY "Admins can manage venues"
    ON venues FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 3. INSTRUCTORS (TEACHERS) TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS instructors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    avatar TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_instructors_email ON instructors(email);

-- Enable RLS
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage instructors"
    ON instructors FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active instructors
CREATE POLICY "Public can read active instructors"
    ON instructors FOR SELECT USING (active = true);

-- Authenticated users can read all instructors
CREATE POLICY "Authenticated can read all instructors"
    ON instructors FOR SELECT TO authenticated USING (true);

-- Admins can manage instructors
CREATE POLICY "Admins can manage instructors"
    ON instructors FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 4. CLASSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL,
    teacher_id TEXT REFERENCES instructors(id) ON DELETE SET NULL,
    sport_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    body_area_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    capacity INTEGER DEFAULT 20,
    registered INTEGER DEFAULT 0,
    status class_status DEFAULT 'draft',
    description TEXT,
    price NUMERIC(10,2) DEFAULT 0,
    credit_cost INTEGER DEFAULT 0,
    allow_dome_reset_override BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_classes_date_time ON classes(date_time);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_venue_id ON classes(venue_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage classes"
    ON classes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read published classes
CREATE POLICY "Public can read published classes"
    ON classes FOR SELECT USING (status = 'published');

-- Authenticated users can read all classes
CREATE POLICY "Authenticated can read all classes"
    ON classes FOR SELECT TO authenticated USING (true);

-- Admins can manage classes
CREATE POLICY "Admins can manage classes"
    ON classes FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 5. REGISTRATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_sport TEXT,
    body_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
    referred_by TEXT,
    status registration_status DEFAULT 'registered',
    payment_status payment_status DEFAULT 'pending',
    payment_method payment_method,
    payment_proof TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_registrations_class_id ON registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- Unique constraint: user cannot register for same class twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_class_user 
    ON registrations(class_id, user_id) WHERE status IN ('registered', 'confirmed');

-- Enable RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage registrations"
    ON registrations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own registrations
CREATE POLICY "Users can read own registrations"
    ON registrations FOR SELECT USING (user_id = auth.uid()::text);

-- Users can create their own registrations
CREATE POLICY "Users can create registrations"
    ON registrations FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own registrations
CREATE POLICY "Users can update own registrations"
    ON registrations FOR UPDATE USING (user_id = auth.uid()::text);

-- Admins can read all registrations
CREATE POLICY "Admins can read all registrations"
    ON registrations FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- Admins can manage all registrations
CREATE POLICY "Admins can manage registrations"
    ON registrations FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 6. TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sport_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    body_area_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    active BOOLEAN DEFAULT true,
    whatsapp_body TEXT,
    email_subject TEXT,
    email_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage templates"
    ON templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active templates
CREATE POLICY "Public can read active templates"
    ON templates FOR SELECT USING (active = true);

-- Authenticated users can read all templates
CREATE POLICY "Authenticated can read all templates"
    ON templates FOR SELECT TO authenticated USING (true);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
    ON templates FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 7. FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    type feedback_type DEFAULT 'post_class',
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    nps_score INTEGER CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10)),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_class_id ON feedback(class_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage feedback"
    ON feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can create feedback for their registrations
CREATE POLICY "Users can create feedback"
    ON feedback FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Users can read all feedback (for viewing class ratings)
CREATE POLICY "Authenticated can read feedback"
    ON feedback FOR SELECT TO authenticated USING (true);

-- Admins can manage feedback
CREATE POLICY "Admins can manage feedback"
    ON feedback FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 8. CALENDAR SYNC TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider calendar_provider NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date TIMESTAMPTZ,
    calendar_id TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_calendar_sync_user_id ON calendar_sync(user_id);

-- Enable RLS
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage calendar_sync"
    ON calendar_sync FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can manage their own calendar sync
CREATE POLICY "Users can manage own calendar sync"
    ON calendar_sync FOR ALL USING (user_id = auth.uid()::text);

-- =============================================================================
-- 9. APP SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    app_name TEXT NOT NULL DEFAULT 'Fascia Dome',
    contact_email TEXT NOT NULL,
    additional_contact_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
    zapper_qr_base64 TEXT,
    landing_page JSONB,
    email_config JSONB,
    google_calendar_tokens JSONB,
    google_calendar_id TEXT,
    google_calendar_sync_enabled BOOLEAN DEFAULT false,
    google_calendar_last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage app_settings"
    ON app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read app settings (for contact info)
CREATE POLICY "Public can read app_settings"
    ON app_settings FOR SELECT USING (true);

-- Admins can manage app settings
CREATE POLICY "Admins can manage app_settings"
    ON app_settings FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- Insert default app settings if not exists
INSERT INTO app_settings (app_name, contact_email) 
SELECT 'Fascia Dome', 'info@fasciadome.co.za'
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

-- =============================================================================
-- 10. DISCLAIMERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS disclaimers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    context TEXT NOT NULL,
    class_type TEXT,
    venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    intro_text TEXT NOT NULL,
    sections JSONB,
    signature_required BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE disclaimers ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage disclaimers"
    ON disclaimers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active disclaimers
CREATE POLICY "Public can read active disclaimers"
    ON disclaimers FOR SELECT USING (active = true);

-- Authenticated users can read all disclaimers
CREATE POLICY "Authenticated can read all disclaimers"
    ON disclaimers FOR SELECT TO authenticated USING (true);

-- Admins can manage disclaimers
CREATE POLICY "Admins can manage disclaimers"
    ON disclaimers FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 11. CREDIT PACKAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY,
    credits INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage credit_packages"
    ON credit_packages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active credit packages
CREATE POLICY "Public can read active credit_packages"
    ON credit_packages FOR SELECT USING (is_active = true);

-- Authenticated users can read all credit packages
CREATE POLICY "Authenticated can read all credit_packages"
    ON credit_packages FOR SELECT TO authenticated USING (true);

-- Admins can manage credit packages
CREATE POLICY "Admins can manage credit_packages"
    ON credit_packages FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 12. CHAT MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    recipient_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    recipient_name TEXT,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage chat_messages"
    ON chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their messages (sent or received)
CREATE POLICY "Users can read own messages"
    ON chat_messages FOR SELECT USING (
        sender_id = auth.uid()::text OR recipient_id = auth.uid()::text
    );

-- Users can send messages
CREATE POLICY "Users can create messages"
    ON chat_messages FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

-- Users can mark their received messages as read
CREATE POLICY "Users can update own messages"
    ON chat_messages FOR UPDATE USING (recipient_id = auth.uid()::text);

-- =============================================================================
-- 13. CREDIT PURCHASES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS credit_purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES credit_packages(id) ON DELETE RESTRICT,
    credits INTEGER NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);

-- Enable RLS
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role can manage credit_purchases"
    ON credit_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own purchases
CREATE POLICY "Users can read own purchases"
    ON credit_purchases FOR SELECT USING (user_id = auth.uid()::text);

-- Users can create purchases
CREATE POLICY "Users can create purchases"
    ON credit_purchases FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Admins can read all purchases
CREATE POLICY "Admins can read all purchases"
    ON credit_purchases FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- Admins can update purchases
CREATE POLICY "Admins can manage purchases"
    ON credit_purchases FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
    );

-- =============================================================================
-- 14. PROCESSED PAYMENTS TABLE (already exists - ensure RLS)
-- =============================================================================

-- Note: This table may already exist from payment_idempotency migration
-- We ensure RLS is enabled and policies exist

ALTER TABLE processed_payments ENABLE ROW LEVEL SECURITY;

-- Service role full access (ensure policy exists)
DROP POLICY IF EXISTS "Service role can manage processed_payments" ON processed_payments;
CREATE POLICY "Service role can manage processed_payments"
    ON processed_payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin read-only access (ensure policy exists)
DROP POLICY IF EXISTS "Admin can view processed_payments" ON processed_payments;
CREATE POLICY "Admin can view processed_payments"
    ON processed_payments FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- =============================================================================
-- CRM TABLES (referenced in existing migrations)
-- =============================================================================

-- CRM Contacts
CREATE TABLE IF NOT EXISTS crm_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'new',
    source TEXT,
    is_client BOOLEAN DEFAULT false,
    movement_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
    primary_body_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
    injuries TEXT[] DEFAULT ARRAY[]::TEXT[],
    health_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_sessions INTEGER DEFAULT 0,
    preferred_class_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    package_history TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_spent NUMERIC(10,2) DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    activities TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    linked_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read crm_contacts" ON crm_contacts;
CREATE POLICY "Anyone can read crm_contacts" ON crm_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage crm_contacts" ON crm_contacts;
CREATE POLICY "Admins can manage crm_contacts" ON crm_contacts FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- CRM Tasks
CREATE TABLE IF NOT EXISTS crm_tasks (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES crm_contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    assigned_to TEXT NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reminders TEXT,
    task_type TEXT
);

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read crm_tasks" ON crm_tasks;
CREATE POLICY "Anyone can read crm_tasks" ON crm_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage crm_tasks" ON crm_tasks;
CREATE POLICY "Admins can manage crm_tasks" ON crm_tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- CRM Pipeline Stages
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    color TEXT NOT NULL,
    description TEXT
);

ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages;
CREATE POLICY "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- CRM Email Templates
CREATE TABLE IF NOT EXISTS crm_email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    variables TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage crm_email_templates" ON crm_email_templates;
CREATE POLICY "Admins can manage crm_email_templates" ON crm_email_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- CRM Campaigns
CREATE TABLE IF NOT EXISTS crm_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    target_segment TEXT,
    target_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    recipient_count INTEGER DEFAULT 0,
    open_rate NUMERIC(5,2),
    click_rate NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL
);

ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage crm_campaigns" ON crm_campaigns;
CREATE POLICY "Admins can manage crm_campaigns" ON crm_campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- Teacher Requests (referenced in migrations)
CREATE TABLE IF NOT EXISTS teacher_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teacher_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create teacher request" ON teacher_requests;
CREATE POLICY "Users can create teacher request" ON teacher_requests 
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own teacher request" ON teacher_requests;
CREATE POLICY "Users can read own teacher request" ON teacher_requests 
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read teacher requests" ON teacher_requests;
CREATE POLICY "Anyone can read teacher requests" ON teacher_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage teacher requests" ON teacher_requests;
CREATE POLICY "Admins can manage teacher requests" ON teacher_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_sync_updated_at BEFORE UPDATE ON calendar_sync
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disclaimers_updated_at BEFORE UPDATE ON disclaimers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at BEFORE UPDATE ON credit_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_email_templates_updated_at BEFORE UPDATE ON crm_email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_requests_updated_at BEFORE UPDATE ON teacher_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMPLETE
-- =============================================================================

COMMIT;

SELECT 'Initial schema migration completed successfully!' AS status;