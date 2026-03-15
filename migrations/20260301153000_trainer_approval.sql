-- Trainer Approval System Migration
-- Adds trainer registration and approval workflow to users table

-- Add trainer status fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_status TEXT DEFAULT 'none' CHECK (trainer_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add is_trainer boolean for quick lookup (denormalized from trainer_status)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN DEFAULT FALSE;

-- Create index for faster trainer lookups
CREATE INDEX IF NOT EXISTS idx_users_trainer_status ON users(trainer_status) WHERE trainer_status != 'none';

-- Enable RLS on users table for trainer-specific policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own trainer status
DROP POLICY IF EXISTS "Users can read own trainer status" ON users;
CREATE POLICY "Users can read own trainer status" ON users FOR SELECT USING (auth.uid() = id::uuid);

-- Policy: Admins can manage all trainer statuses
DROP POLICY IF EXISTS "Admins can manage trainer status" ON users;
CREATE POLICY "Admins can manage trainer status" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- Create trainer_requests table for tracking registration details
CREATE TABLE IF NOT EXISTS trainer_requests (
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

-- RLS for trainer_requests
ALTER TABLE trainer_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can submit a trainer request
DROP POLICY IF EXISTS "Anyone can submit trainer request" ON trainer_requests;
CREATE POLICY "Anyone can submit trainer request" ON trainer_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can read their own requests
DROP POLICY IF EXISTS "Users can read own trainer request" ON trainer_requests;
CREATE POLICY "Users can read own trainer request" ON trainer_requests FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Admins can manage all requests
DROP POLICY IF EXISTS "Admins can manage trainer requests" ON trainer_requests;
CREATE POLICY "Admins can manage trainer requests" ON trainer_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true AND admin_role IN ('super_admin', 'admin'))
);

-- Add index for admin review
CREATE INDEX IF NOT EXISTS idx_trainer_requests_status ON trainer_requests(status);
