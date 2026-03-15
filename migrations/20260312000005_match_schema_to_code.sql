-- Fix schema to match code expectations (SAFE - adds columns, doesn't rename)
-- Run this in Supabase SQL Editor

-- =============================================================================
-- VENUES TABLE - Add missing columns
-- =============================================================================
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- TEACHERS TABLE - Add missing columns  
-- =============================================================================
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar TEXT;  -- Already exists, but ensure it's here
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- CLASSES TABLE - Add all missing columns to match code
-- =============================================================================
-- Add columns that code expects but are missing
ALTER TABLE classes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS registered INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS allow_dome_reset_override BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS name TEXT;

-- Sync name -> title (code uses title but DB has name)
UPDATE classes SET title = name WHERE title IS NULL AND name IS NOT NULL;
UPDATE classes SET name = class_name WHERE class_name IS NOT NULL;

-- Sync max_participants -> capacity  
UPDATE classes SET capacity = max_participants WHERE capacity IS NULL AND max_participants IS NOT NULL;

-- Copy dome_id to venue_id (they reference the same thing)
UPDATE classes SET venue_id = dome_id WHERE venue_id IS NULL AND dome_id IS NOT NULL;

-- Copy duration_minutes -> duration
UPDATE classes SET duration = duration_minutes WHERE duration IS NULL AND duration_minutes IS NOT NULL;

SELECT 'Schema updated' as result;
