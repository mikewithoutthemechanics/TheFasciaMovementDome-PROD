-- =============================================================================
-- STEP 1: First run this to check current state
-- =============================================================================

-- Check what tables exist
SELECT 'Existing tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check classes table structure
SELECT 'Classes columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'classes' ORDER BY ordinal_position;

-- Check if instructors or teachers table exists
SELECT 'Instructor/Teacher tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('instructors', 'teachers');

-- =============================================================================
-- STEP 2: Run the appropriate fix based on what you found
-- =============================================================================

BEGIN;

-- FIX 1: If instructors table exists but teachers doesn't, rename it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instructors') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') THEN
        
        ALTER TABLE instructors RENAME TO teachers;
        
        -- Update foreign key if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'classes_teacher_id_fkey' AND table_name = 'classes') THEN
            ALTER TABLE classes DROP CONSTRAINT classes_teacher_id_fkey;
            ALTER TABLE classes ADD CONSTRAINT classes_teacher_id_fkey 
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Renamed instructors to teachers';
    END IF;
END $$;

-- FIX 2: Add venue_id column if missing from classes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'venue_id') THEN
        
        ALTER TABLE classes ADD COLUMN venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added venue_id column to classes';
    END IF;
END $$;

-- FIX 3: Add teacher_id column if missing from classes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'teacher_id') THEN
        
        ALTER TABLE classes ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added teacher_id column to classes';
    END IF;
END $$;

-- FIX 4: Fix RLS policies for INSERT (the main issue blocking saves)
-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage venues" ON venues;
DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can manage instructors" ON instructors;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;

-- Recreate with proper FOR ALL to allow INSERT
CREATE POLICY "Admins can manage venues" ON venues FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Use teachers if it exists, otherwise instructors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') THEN
        CREATE POLICY "Admins can manage teachers" ON teachers FOR ALL 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
            WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instructors') THEN
        CREATE POLICY "Admins can manage instructors" ON instructors FOR ALL 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
            WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));
    END IF;
END $$;

CREATE POLICY "Admins can manage classes" ON classes FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Registrations
DROP POLICY IF EXISTS "Admins can manage registrations" ON registrations;
CREATE POLICY "Admins can manage registrations" ON registrations FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- Templates
DROP POLICY IF EXISTS "Admins can manage templates" ON templates;
CREATE POLICY "Admins can manage templates" ON templates FOR ALL 
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

COMMIT;

SELECT 'Step 2 complete - RLS policies fixed!' AS status;

-- Verify the fix
SELECT 'Updated RLS policies:' AS info;
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND policyname LIKE '%Admins can%'
ORDER BY tablename;
