-- Teacher Approval System Migration
-- Adds teacher registration and approval workflow to users table

-- Add teacher status fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_status TEXT DEFAULT 'none' CHECK (teacher_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add is_teacher boolean for quick lookup (denormalized from teacher_status)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN DEFAULT FALSE;

-- Create index for faster teacher lookups
CREATE INDEX IF NOT EXISTS idx_users_teacher_status ON users(teacher_status) WHERE teacher_status != 'none';

-- Enable RLS on users table for teacher-specific policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own teacher status
DROP POLICY IF EXISTS "Users can read own teacher status" ON users;
CREATE POLICY "Users can read own teacher status" ON users FOR SELECT USING (auth.uid() = id::uuid);

-- Policy: Admins can manage all teacher statuses
DROP POLICY IF EXISTS "Admins can manage teacher status" ON users;
CREATE POLICY "Admins can manage teacher status" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- Create teacher_requests table for tracking registration details
CREATE TABLE IF NOT EXISTS teacher_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  qualifications TEXT,
  experience TEXT,
  specializations TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT
);

-- RLS for teacher_requests
ALTER TABLE teacher_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can submit a teacher request
DROP POLICY IF EXISTS "Anyone can submit teacher request" ON teacher_requests;
CREATE POLICY "Anyone can submit teacher request" ON teacher_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can read their own requests
DROP POLICY IF EXISTS "Users can read own teacher request" ON teacher_requests;
CREATE POLICY "Users can read own teacher request" ON teacher_requests FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Admins can manage all requests
DROP POLICY IF EXISTS "Admins can manage teacher requests" ON teacher_requests;
CREATE POLICY "Admins can manage teacher requests" ON teacher_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- Add index for admin review
CREATE INDEX IF NOT EXISTS idx_teacher_requests_status ON teacher_requests(status);
