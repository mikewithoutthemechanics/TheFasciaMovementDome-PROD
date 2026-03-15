-- =============================================================================
-- PAYMENT IDEMPOTENCY TABLE
-- =============================================================================
-- CRITICAL FIX: Prevents duplicate payment processing
-- Previously used in-memory Set which was lost on server restart

CREATE TABLE IF NOT EXISTS processed_payments (
  id TEXT PRIMARY KEY, -- PayFast payment ID (m_payment_id)
  payment_status TEXT NOT NULL, -- COMPLETE, CANCELLED, etc.
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  credit_package_id TEXT,
  credits_added INTEGER,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT, -- For audit trail
  request_data JSONB -- Store the full ITN data for debugging
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_payments_id ON processed_payments(id);

-- Index for cleanup of old records (keep 90 days)
CREATE INDEX IF NOT EXISTS idx_processed_payments_date ON processed_payments(processed_at);

-- Enable RLS
ALTER TABLE processed_payments ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (for security)
CREATE POLICY "Service role can manage processed_payments"
  ON processed_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin read-only access
CREATE POLICY "Admin can view processed_payments"
  ON processed_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- =============================================================================
-- CLEANUP FUNCTION
-- =============================================================================
-- Remove records older than 90 days to prevent table bloat
CREATE OR REPLACE FUNCTION cleanup_old_processed_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM processed_payments
  WHERE processed_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Schedule cleanup (run daily at 3 AM)
-- Note: Requires pg_cron extension or external scheduler
-- SELECT cron.schedule('cleanup-payments', '0 3 * * *', 'SELECT cleanup_old_processed_payments()');
