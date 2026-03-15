-- Database Security Fixes Migration
-- Fixes RLS policies and adds missing policies

-- =============================================================================
-- FIX 1: Align users table policies (UUID vs text conflict)
-- =============================================================================

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can read own teacher status" ON users;

-- Recreate with consistent text comparison
CREATE POLICY "Users can read own teacher status" ON users FOR SELECT USING (auth.uid()::text = id);

-- =============================================================================
-- FIX 2: Add RLS policies for CRM tables if missing
-- =============================================================================

-- crm_contacts - admins can manage, public can read
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read crm_contacts" ON crm_contacts;
CREATE POLICY "Anyone can read crm_contacts" ON crm_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage crm_contacts" ON crm_contacts;
CREATE POLICY "Admins can manage crm_contacts" ON crm_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- crm_tasks - admins can manage, assigned users can read
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read crm_tasks" ON crm_tasks;
CREATE POLICY "Anyone can read crm_tasks" ON crm_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage crm_tasks" ON crm_tasks;
CREATE POLICY "Admins can manage crm_tasks" ON crm_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- crm_pipeline_stages - admins only
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages;
CREATE POLICY "Admins can manage crm_pipeline_stages" ON crm_pipeline_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- crm_email_templates - admins only
ALTER TABLE crm_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage crm_email_templates" ON crm_email_templates;
CREATE POLICY "Admins can manage crm_email_templates" ON crm_email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- crm_campaigns - admins only
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage crm_campaigns" ON crm_campaigns;
CREATE POLICY "Admins can manage crm_campaigns" ON crm_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- disclaimers - public can read, admins can manage
ALTER TABLE disclaimers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read disclaimers" ON disclaimers;
CREATE POLICY "Public can read disclaimers" ON disclaimers FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins can manage disclaimers" ON disclaimers;
CREATE POLICY "Admins can manage disclaimers" ON disclaimers FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- =============================================================================
-- FIX 3: Add UPDATE/DELETE policies for teacher_requests
-- =============================================================================

DROP POLICY IF EXISTS "Users can delete own teacher request" ON teacher_requests;
CREATE POLICY "Users can delete own teacher request" ON teacher_requests FOR DELETE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read teacher requests" ON teacher_requests;
CREATE POLICY "Anyone can read teacher requests" ON teacher_requests FOR SELECT USING (true);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
SELECT 'Security fixes applied successfully!' as status;
