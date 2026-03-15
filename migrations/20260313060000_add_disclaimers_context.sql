-- Add missing context column to disclaimers table
ALTER TABLE disclaimers ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'global';
