-- Fix existing data to ensure it shows in admin UI

-- Set active=true for all existing domes (in case they don't have the column yet)
UPDATE domes SET active = true WHERE active IS NULL OR active = false;

-- Set active=true for all existing teachers
UPDATE teachers SET active = true WHERE active IS NULL OR active = false;

-- Check what's in the tables
SELECT 'domes:' as table_name, COUNT(*) as count FROM domes
UNION ALL
SELECT 'teachers:', COUNT(*) FROM teachers
UNION ALL  
SELECT 'classes:', COUNT(*) FROM classes;
