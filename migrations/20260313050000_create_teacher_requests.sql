-- Create teacher_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS teacher_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    qualifications TEXT,
    experience TEXT,
    specializations TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teacher_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Public can read teacher requests" ON teacher_requests FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage teacher requests" ON teacher_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'teacher_requests table created' as result;
