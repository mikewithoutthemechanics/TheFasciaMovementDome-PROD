-- Fix RLS policy for teacher_requests INSERT to require authentication
DROP POLICY IF EXISTS "Anyone can submit teacher request" ON teacher_requests;

CREATE POLICY "Anyone can submit teacher request" ON teacher_requests 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
