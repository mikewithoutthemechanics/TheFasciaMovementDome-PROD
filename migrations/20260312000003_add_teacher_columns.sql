-- Fix missing columns in teachers table
-- Run this in Supabase SQL Editor

-- Add specialties column (array of strings)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add avatar column (renamed from photo_url in some contexts)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teachers' 
ORDER BY ordinal_position;
