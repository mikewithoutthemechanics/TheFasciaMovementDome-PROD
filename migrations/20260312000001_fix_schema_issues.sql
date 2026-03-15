-- =============================================================================
-- MIGRATION: Fix Table Naming, Column Names, and RLS Policies
-- Created: 2026-03-12
-- Issues Fixed:
--   1. Rename instructors table to teachers
--   2. Fix class table column names (date_time -> start_time/end_time, capacity -> max_capacity)
--   3. Add RLS policies for INSERT operations
--   4. Add missing indexes
--   5. Add missing tables/columns
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Rename instructors to teachers
-- =============================================================================

-- Check if instructors table exists and teachers doesn't
DO $$
BEGIN
    -- If teachers exists but instructors also exists, drop instructors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instructors') THEN
        DROP TABLE IF EXISTS instructors CASCADE;
        RAISE NOTICE 'Dropped instructors table (teachers already exists)';
    END IF;
    
    -- If instructors exists but teachers doesn't, rename instructors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instructors') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') THEN
        ALTER TABLE instructors RENAME TO teachers;
        RAISE NOTICE 'Renamed instructors to teachers';
    END IF;
END $$;

-- Update foreign key references in classes table
ALTER TABLE classes 
    DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey,
    ADD CONSTRAINT classes_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 2: Fix classes table column names
-- =============================================================================

-- Check if we need to add new columns
DO $$
BEGIN
    -- Add start_time and end_time if date_time exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'date_time')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'start_time') THEN
        
        -- Copy date_time to start_time
        ALTER TABLE classes ADD COLUMN start_time TIMESTAMPTZ;
        UPDATE classes SET start_time = date_time;
        
        -- Calculate end_time from start_time + duration
        ALTER TABLE classes ADD COLUMN end_time TIMESTAMPTZ;
        UPDATE classes SET end_time = start_time + (duration || ' minutes')::interval;
        
        -- Drop old date_time column
        ALTER TABLE classes DROP COLUMN date_time;
        
        RAISE NOTICE 'Migrated date_time to start_time/end_time';
    END IF;
END $$;

DO $$
BEGIN
    -- Add max_capacity if capacity exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'capacity')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'max_capacity') THEN
        
        ALTER TABLE classes ADD COLUMN max_capacity INTEGER;
        UPDATE classes SET max_capacity = capacity;
        ALTER TABLE classes DROP COLUMN capacity;
        
        RAISE NOTICE 'Migrated capacity to max_capacity';
    END IF;
END $$;

-- Add workshop-specific columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'class_type') THEN
        ALTER TABLE classes ADD COLUMN class_type TEXT DEFAULT 'class';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'custom_fields') THEN
        ALTER TABLE classes ADD COLUMN custom_fields JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'workshop_price') THEN
        ALTER TABLE classes ADD COLUMN workshop_price NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'workshop_materials') THEN
        ALTER TABLE classes ADD COLUMN workshop_materials TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'workshop_prerequisites') THEN
        ALTER TABLE classes ADD COLUMN workshop_prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Fix RLS Policies for INSERT operations
-- =============================================================================

-- Drop existing admin policies that might be blocking inserts
DROP POLICY IF EXISTS "Admins can manage venues" ON venues;
DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage registrations" ON registrations;
DROP POLICY IF EXISTS "Admins can manage templates" ON templates;
DROP POLICY IF EXISTS "Admins can manage feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can manage app_settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can manage disclaimers" ON disclaimers;
DROP POLICY IF EXISTS "Admins can manage credit_packages" ON credit_packages;
DROP POLICY IF EXISTS "Admins can manage chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can manage credit_purchases" ON credit_purchases;
DROP POLICY IF EXISTS "Admins can manage crm_contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Admins can manage crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "Admins can manage crm_email_templates" ON crm_email_templates;
DROP POLICY IF EXISTS "Admins can manage crm_campaigns" ON crm_campaigns;

-- Recreate policies with proper INSERT support

-- Venues
CREATE POLICY "Admins can manage venues" ON venues FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Teachers
CREATE POLICY "Admins can manage teachers" ON teachers FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Classes
CREATE POLICY "Admins can manage classes" ON classes FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Registrations
CREATE POLICY "Admins can manage registrations" ON registrations FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Templates
CREATE POLICY "Admins can manage templates" ON templates FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Feedback
CREATE POLICY "Admins can manage feedback" ON feedback FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- App Settings
CREATE POLICY "Admins can manage app_settings" ON app_settings FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Disclaimers
CREATE POLICY "Admins can manage disclaimers" ON disclaimers FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Credit Packages
CREATE POLICY "Admins can manage credit_packages" ON credit_packages FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Chat Messages
CREATE POLICY "Admins can manage messages" ON chat_messages FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Credit Purchases
CREATE POLICY "Admins can manage purchases" ON credit_purchases FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- CRM Contacts
CREATE POLICY "Admins can manage crm_contacts" ON crm_contacts FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));

-- CRM Tasks
CREATE POLICY "Admins can manage crm_tasks" ON crm_tasks FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));

-- CRM Pipeline Stages
CREATE POLICY "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));

-- CRM Email Templates
CREATE POLICY "Admins can manage crm_email_templates" ON crm_email_templates FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));

-- CRM Campaigns
CREATE POLICY "Admins can manage crm_campaigns" ON crm_campaigns FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));

-- =============================================================================
-- STEP 4: Add missing indexes
-- =============================================================================

-- Teachers indexes
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_active ON teachers(active) WHERE active = true;

-- Classes indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_classes_start_time ON classes(start_time);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_venue_id ON classes(venue_id);

-- Registrations indexes (if not already exist)
CREATE INDEX IF NOT EXISTS idx_registrations_class_id ON registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_teacher_id ON feedback(teacher_id);

-- CRM indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact_id ON crm_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);

-- =============================================================================
-- STEP 5: Add missing tables and columns
-- =============================================================================

-- Add class_reminder_opt_in to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'class_reminder_opt_in') THEN
        ALTER TABLE users ADD COLUMN class_reminder_opt_in BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add credit_purchases table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_purchases') THEN
        CREATE TABLE credit_purchases (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            package_id TEXT REFERENCES credit_packages(id) ON DELETE RESTRICT,
            credits INTEGER NOT NULL,
            amount NUMERIC(10,2) NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payfast_payment_id TEXT,
            payfast_m_payment_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            completed_at TIMESTAMPTZ
        );
        
        CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
        CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
        
        ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Service role can manage credit_purchases" ON credit_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
        CREATE POLICY "Users can read own purchases" ON credit_purchases FOR SELECT USING (user_id = auth.uid()::text);
        CREATE POLICY "Users can create purchases" ON credit_purchases FOR INSERT WITH CHECK (user_id = auth.uid()::text);
        CREATE POLICY "Admins can read all purchases" ON credit_purchases FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));
        CREATE POLICY "Admins can manage purchases" ON credit_purchases FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));
        
        RAISE NOTICE 'Created credit_purchases table';
    END IF;
END $$;

-- Add teacher_requests table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_requests') THEN
        CREATE TABLE teacher_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
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
        
        CREATE POLICY "Users can create teacher request" ON teacher_requests FOR INSERT WITH CHECK (user_id = auth.uid()::text);
        CREATE POLICY "Users can read own teacher request" ON teacher_requests FOR SELECT USING (user_id = auth.uid()::text);
        CREATE POLICY "Anyone can read teacher requests" ON teacher_requests FOR SELECT USING (true);
        CREATE POLICY "Admins can manage teacher requests" ON teacher_requests FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));
        
        RAISE NOTICE 'Created teacher_requests table';
    END IF;
END $$;

-- Add missing CRM tables if they don't exist
DO $$
BEGIN
    -- crm_contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contacts') THEN
        CREATE TABLE crm_contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            status TEXT DEFAULT 'new_inquiry',
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
        CREATE POLICY "Anyone can read crm_contacts" ON crm_contacts FOR SELECT USING (true);
        CREATE POLICY "Admins can manage crm_contacts" ON crm_contacts FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));
        
        RAISE NOTICE 'Created crm_contacts table';
    END IF;
    
    -- crm_tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tasks') THEN
        CREATE TABLE crm_tasks (
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
        CREATE POLICY "Anyone can read crm_tasks" ON crm_tasks FOR SELECT USING (true);
        CREATE POLICY "Admins can manage crm_tasks" ON crm_tasks FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));
        
        RAISE NOTICE 'Created crm_tasks table';
    END IF;
    
    -- crm_pipeline_stages
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_pipeline_stages') THEN
        CREATE TABLE crm_pipeline_stages (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            "order" INTEGER NOT NULL,
            color TEXT NOT NULL,
            description TEXT
        );
        
        ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));
        
        RAISE NOTICE 'Created crm_pipeline_stages table';
    END IF;
    
    -- crm_email_templates
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_email_templates') THEN
        CREATE TABLE crm_email_templates (
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
        CREATE POLICY "Admins can manage crm_email_templates" ON crm_email_templates FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));
        
        RAISE NOTICE 'Created crm_email_templates table';
    END IF;
    
    -- crm_campaigns
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_campaigns') THEN
        CREATE TABLE crm_campaigns (
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
        CREATE POLICY "Admins can manage crm_campaigns" ON crm_campaigns FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin')));
        
        RAISE NOTICE 'Created crm_campaigns table';
    END IF;
END $$;

-- =============================================================================
-- STEP 6: Update updated_at triggers
-- =============================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables that don't have them
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_purchases_updated_at ON credit_purchases;
CREATE TRIGGER update_credit_purchases_updated_at BEFORE UPDATE ON credit_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_requests_updated_at ON teacher_requests;
CREATE TRIGGER update_teacher_requests_updated_at BEFORE UPDATE ON teacher_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_tasks_updated_at ON crm_tasks;
CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_email_templates_updated_at ON crm_email_templates;
CREATE TRIGGER update_crm_email_templates_updated_at BEFORE UPDATE ON crm_email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMPLETE
-- =============================================================================

COMMIT;

SELECT 'Migration completed successfully!' AS status;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check table names
SELECT 'Tables:' AS info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check teachers table columns
SELECT 'Teachers table columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'teachers' ORDER BY ordinal_position;

-- Check classes table columns
SELECT 'Classes table columns:' AS info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'classes' ORDER BY ordinal_position;

-- Check RLS policies on key tables
SELECT 'RLS Policies:' AS info;
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('venues', 'teachers', 'classes', 'registrations')
ORDER BY tablename, policyname;
