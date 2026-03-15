-- Fix RLS policies to allow anonymous/public inserts
-- Run this in Supabase SQL Editor

-- Teachers table - allow anyone to insert (for now, since app uses anon key)
DROP POLICY IF EXISTS "Anyone can view teachers" ON teachers;
CREATE POLICY "Anyone can view teachers" ON teachers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON teachers;
CREATE POLICY "Anyone can insert teachers" ON teachers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update teachers" ON teachers;
CREATE POLICY "Anyone can update teachers" ON teachers FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON teachers;
CREATE POLICY "Anyone can delete teachers" ON teachers FOR DELETE USING (true);

-- Venues table - same fix
DROP POLICY IF EXISTS "Anyone can view venues" ON venues;
CREATE POLICY "Anyone can view venues" ON venues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert venues" ON venues;
CREATE POLICY "Anyone can insert venues" ON venues FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update venues" ON venues;
CREATE POLICY "Anyone can update venues" ON venues FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete venues" ON venues;
CREATE POLICY "Anyone can delete venues" ON venues FOR DELETE USING (true);

-- Classes table - same fix
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert classes" ON classes;
CREATE POLICY "Anyone can insert classes" ON classes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update classes" ON classes;
CREATE POLICY "Anyone can update classes" ON classes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete classes" ON classes;
CREATE POLICY "Anyone can delete classes" ON classes FOR DELETE USING (true);

SELECT 'RLS policies updated' as result;
