-- Check if teacher_requests table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'teacher_requests';

-- Check all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
