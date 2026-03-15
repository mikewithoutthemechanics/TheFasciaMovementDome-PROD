-- Add capacity to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'venues' ORDER BY ordinal_position;
