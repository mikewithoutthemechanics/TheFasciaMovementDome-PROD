-- Migration to support using domes table for locations
-- Run this in Supabase SQL Editor

-- =============================================================================
-- DOMES TABLE - Add capacity column (code expects this)
-- =============================================================================
ALTER TABLE domes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 20;
ALTER TABLE domes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE domes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- CLASSES TABLE - Add missing columns that code expects
-- =============================================================================
-- These columns should already exist, but ensure they're present
ALTER TABLE classes ADD COLUMN IF NOT EXISTS dome_id TEXT REFERENCES domes(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS registered INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS allow_dome_reset_override BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS date_time TIMESTAMPTZ;

-- Sync name -> title (code uses title but DB may have name)
UPDATE classes SET title = name WHERE title IS NULL AND name IS NOT NULL;

-- Sync max_participants -> capacity  
UPDATE classes SET capacity = max_participants WHERE capacity IS NULL AND max_participants IS NOT NULL;

-- Copy duration_minutes -> duration
UPDATE classes SET duration = duration_minutes WHERE duration IS NULL AND duration_minutes IS NOT NULL;

SELECT 'Domes table migration complete' as result;
