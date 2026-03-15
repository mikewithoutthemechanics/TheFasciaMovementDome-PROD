-- Fix RLS policies for existing tables to allow authenticated users to manage data
-- Only process tables that exist in the database

-- Classes table
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert classes" ON classes;
CREATE POLICY "Authenticated users can insert classes" ON classes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update classes" ON classes;
CREATE POLICY "Authenticated users can update classes" ON classes FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete classes" ON classes;
CREATE POLICY "Authenticated users can delete classes" ON classes FOR DELETE USING (auth.role() = 'authenticated');

-- Teachers table
DROP POLICY IF EXISTS "Anyone can view teachers" ON teachers;
CREATE POLICY "Anyone can view teachers" ON teachers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON teachers;
CREATE POLICY "Authenticated users can insert teachers" ON teachers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update teachers" ON teachers;
CREATE POLICY "Authenticated users can update teachers" ON teachers FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON teachers;
CREATE POLICY "Authenticated users can delete teachers" ON teachers FOR DELETE USING (auth.role() = 'authenticated');

-- Venues table
DROP POLICY IF EXISTS "Anyone can view venues" ON venues;
CREATE POLICY "Anyone can view venues" ON venues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert venues" ON venues;
CREATE POLICY "Authenticated users can insert venues" ON venues FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update venues" ON venues;
CREATE POLICY "Authenticated users can update venues" ON venues FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete venues" ON venues;
CREATE POLICY "Authenticated users can delete venues" ON venues FOR DELETE USING (auth.role() = 'authenticated');

-- Registrations table
DROP POLICY IF EXISTS "Anyone can view registrations" ON registrations;
CREATE POLICY "Anyone can view registrations" ON registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert registrations" ON registrations;
CREATE POLICY "Authenticated users can insert registrations" ON registrations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update registrations" ON registrations;
CREATE POLICY "Authenticated users can update registrations" ON registrations FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete registrations" ON registrations;
CREATE POLICY "Authenticated users can delete registrations" ON registrations FOR DELETE USING (auth.role() = 'authenticated');

-- Templates table
DROP POLICY IF EXISTS "Anyone can view templates" ON templates;
CREATE POLICY "Anyone can view templates" ON templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON templates;
CREATE POLICY "Authenticated users can insert templates" ON templates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;
CREATE POLICY "Authenticated users can update templates" ON templates FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON templates;
CREATE POLICY "Authenticated users can delete templates" ON templates FOR DELETE USING (auth.role() = 'authenticated');

-- App settings table
DROP POLICY IF EXISTS "Anyone can view app_settings" ON app_settings;
CREATE POLICY "Anyone can view app_settings" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert app_settings" ON app_settings;
CREATE POLICY "Authenticated users can insert app_settings" ON app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update app_settings" ON app_settings;
CREATE POLICY "Authenticated users can update app_settings" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete app_settings" ON app_settings;
CREATE POLICY "Authenticated users can delete app_settings" ON app_settings FOR DELETE USING (auth.role() = 'authenticated');

-- Feedback table
DROP POLICY IF EXISTS "Anyone can view feedback" ON feedback;
CREATE POLICY "Anyone can view feedback" ON feedback FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;
CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update feedback" ON feedback;
CREATE POLICY "Authenticated users can update feedback" ON feedback FOR UPDATE USING (auth.role() = 'authenticated');

-- Teacher requests table
DROP POLICY IF EXISTS "Anyone can submit teacher request" ON teacher_requests;
CREATE POLICY "Anyone can submit teacher request" ON teacher_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can view teacher requests" ON teacher_requests;
CREATE POLICY "Authenticated users can view teacher requests" ON teacher_requests FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update teacher requests" ON teacher_requests;
CREATE POLICY "Authenticated users can update teacher requests" ON teacher_requests FOR UPDATE USING (auth.role() = 'authenticated');
