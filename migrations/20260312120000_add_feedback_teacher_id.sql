-- Add teacher_id column to feedback table for routing feedback to teachers
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;

-- Add index for teacher_id
CREATE INDEX IF NOT EXISTS idx_feedback_teacher_id ON feedback(teacher_id);
