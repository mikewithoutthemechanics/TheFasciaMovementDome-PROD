-- Check classes columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'classes';

-- Check what's in the class
SELECT * FROM classes;
