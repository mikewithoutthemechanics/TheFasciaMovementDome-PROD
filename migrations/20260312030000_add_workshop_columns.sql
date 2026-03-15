-- Add workshop-specific columns to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_type TEXT DEFAULT 'class';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS workshop_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS workshop_materials TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE classes ADD COLUMN IF NOT EXISTS workshop_prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[];
