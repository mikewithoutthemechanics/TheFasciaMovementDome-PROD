-- Fix RLS policy for trainer_requests INSERT to require authentication
DROP POLICY IF EXISTS "Anyone can submit trainer request" ON trainer_requests;

CREATE POLICY "Anyone can submit trainer request" ON trainer_requests 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
