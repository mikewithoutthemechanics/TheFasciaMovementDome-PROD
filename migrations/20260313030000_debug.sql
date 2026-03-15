-- Check classes table columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'classes';

-- Try direct select
SELECT COUNT(*) as class_count FROM classes;
