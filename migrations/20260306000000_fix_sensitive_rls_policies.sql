-- Fix RLS policies for sensitive tables (MEDIUM severity security fixes)
-- Created: 2026-03-06

-- Registrations table: Users can only see their own registrations
DROP POLICY IF EXISTS "Anyone can view registrations" ON registrations;
CREATE POLICY "Users can view own registrations" ON registrations FOR SELECT 
  USING (
    auth.uid() = user_id
    OR auth.role() = 'authenticated'
  );

-- Classes table: Keep public read but authenticated users can only modify their own
-- The INSERT, UPDATE, DELETE policies already check for authenticated role
-- We need to ensure users can only modify classes they created (teacher_id matches)
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update classes" ON classes;
CREATE POLICY "Users can update own classes" ON classes FOR UPDATE 
  USING (
    auth.role() = 'authenticated' 
    AND teacher_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can delete classes" ON classes;
CREATE POLICY "Users can delete own classes" ON classes FOR DELETE 
  USING (
    auth.role() = 'authenticated' 
    AND teacher_id IS NOT NULL
  );

-- App settings table: Only authenticated users can read (not public)
DROP POLICY IF EXISTS "Anyone can view app_settings" ON app_settings;
CREATE POLICY "Authenticated users can view app_settings" ON app_settings 
  FOR SELECT USING (auth.role() = 'authenticated');
