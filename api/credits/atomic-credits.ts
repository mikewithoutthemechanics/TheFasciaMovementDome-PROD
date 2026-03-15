/**
 * Atomic Credit Update Module
 * 
 * This file consolidates the SQL migration and TypeScript wrappers for atomic credit operations.
 * 
 * USAGE:
 * 1. SQL Migration: Copy the SQL from ATOMIC_CREDIT_UPDATE_SQL constant and execute it in your PostgreSQL database
 * 2. TypeScript: Import and use the wrapper functions (addUserCredits, getUserCredits, etc.)
 */

import { supabase } from '../../services/supabase-client';
import type { CreditOperationResult, AddUserCreditsParams } from '../../types';

/**
 * SQL Migration - Atomic Credit Update Function
 * 
 * Copy and execute this SQL in your PostgreSQL database (e.g., via Supabase SQL Editor)
 * to create the required database functions.
 * 
 * This creates two functions:
 * - add_user_credits: Atomically add or deduct credits with validation
 * - get_user_credits: Get a user's current credit balance
 */
export const ATOMIC_CREDIT_UPDATE_SQL = `-- =============================================================================
-- Atomic Credit Update RPC Function
-- 
-- Creates add_user_credits function for atomic credit additions and deductions
-- with proper validation and error handling
--
-- Date: 20260315
-- =============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS add_user_credits(UUID, INTEGER, TEXT);

-- Create the atomic credit update function
-- Parameters:
--   p_user_id: UUID of the user to update credits for
--   p_amount: Integer amount to add (positive) or deduct (negative)
--   p_reason: Optional text describing the reason for the update
--
-- Returns:
--   JSON object with:
--     - success: boolean
--     - new_balance: integer (the new credit balance)
--     - error: string (if success is false)
--
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET client_min_messages = 'ERROR'
AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_user_exists BOOLEAN;
    v_result JSONB;
BEGIN
    -- Validate user_id is not null
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'new_balance', 0,
            'error', 'User ID is required'
        );
    END IF;

    -- Validate amount is not zero
    IF p_amount IS NULL OR p_amount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'new_balance', 0,
            'error', 'Credit amount cannot be zero'
        );
    END IF;

    -- Check if user exists and get current credits
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id), credits
    INTO v_user_exists, v_current_credits
    FROM users
    WHERE id = p_user_id;

    -- Handle user not found
    IF NOT v_user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'new_balance', 0,
            'error', 'User not found'
        );
    END IF;

    -- Handle negative amount (deduction) with insufficient credits
    IF p_amount < 0 AND (v_current_credits + p_amount) < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'new_balance', v_current_credits,
            'error', 'Insufficient credits. Current balance: ' || v_current_credits
        );
    END IF;

    -- Perform atomic update using SQL expression to prevent race conditions
    -- This uses credits = credits + p_amount which is atomic in PostgreSQL
    UPDATE users
    SET credits = credits + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits INTO v_new_credits;

    -- Log the credit change for audit trail (optional - insert into audit log if needed)
    IF p_reason IS NOT NULL THEN
        RAISE NOTICE 'Credit update for user %: % credits (%s). Reason: %', 
            p_user_id, p_amount, 
            CASE WHEN p_amount > 0 THEN 'added' ELSE 'deducted' END,
            p_reason;
    END IF;

    -- Return success with new balance
    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_credits,
        'error', NULL
    );

EXCEPTION WHEN OTHERS THEN
    -- Handle any unexpected errors
    RETURN jsonb_build_object(
        'success', false,
        'new_balance', 0,
        'error', SQLERRM
    );
END;
$$;

-- grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_user_credits TO authenticated;

-- Also grant to anon for cases where it's needed (e.g., webhooks)
GRANT EXECUTE ON FUNCTION add_user_credits TO anon;

-- =============================================================================
-- Helper function to get current credit balance
-- =============================================================================

DROP FUNCTION IF EXISTS get_user_credits(UUID);

CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    SELECT credits INTO v_credits
    FROM users
    WHERE id = p_user_id;

    RETURN COALESCE(v_credits, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credits TO anon;
`;

/**
 * Call the add_user_credits RPC function to atomically add or deduct credits
 * 
 * @param params - The parameters for the credit operation
 * @returns Promise<CreditOperationResult> - Result with success status, new balance, and error message if any
 * 
 * @example
 * // Add credits (positive amount)
 * const result = await addUserCredits({ userId: 'uuid', amount: 10, reason: 'Package purchase' });
 * 
 * @example
 * // Deduct credits (negative amount)
 * const result = await addUserCredits({ userId: 'uuid', amount: -5, reason: 'Class booking' });
 */
export async function addUserCredits(params: AddUserCreditsParams): Promise<CreditOperationResult> {
  const { userId, amount, reason } = params;

  try {
    const { data, error } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason || null
    });

    if (error) {
      console.error('[addUserCredits] RPC error:', error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || 'Failed to update credits'
      };
    }

    // The RPC returns JSONB with success, new_balance, and error fields
    const result = data as {
      success: boolean;
      new_balance: number;
      error: string | null;
    };

    return {
      success: result.success,
      newBalance: result.new_balance,
      error: result.error
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('[addUserCredits] Exception:', errorMessage);
    return {
      success: false,
      newBalance: 0,
      error: errorMessage
    };
  }
}

/**
 * Add credits to a user's account (convenience function)
 * 
 * @param userId - The user's UUID
 * @param amount - Positive amount to add
 * @param reason - Optional reason for the credit addition
 * @returns Promise<CreditOperationResult>
 */
export async function addCredits(
  userId: string, 
  amount: number, 
  reason?: string
): Promise<CreditOperationResult> {
  return addUserCredits({ userId, amount: Math.abs(amount), reason });
}

/**
 * Deduct credits from a user's account (convenience function)
 * 
 * @param userId - The user's UUID
 * @param amount - Positive amount to deduct (will be negated internally)
 * @param reason - Optional reason for the credit deduction
 * @returns Promise<CreditOperationResult>
 */
export async function deductCredits(
  userId: string, 
  amount: number, 
  reason?: string
): Promise<CreditOperationResult> {
  return addUserCredits({ userId, amount: -Math.abs(amount), reason });
}

/**
 * Get a user's current credit balance
 * 
 * @param userId - The user's UUID
 * @returns Promise<number> - The current credit balance (0 if user not found)
 * 
 * @example
 * const balance = await getUserCredits('uuid');
 */
export async function getUserCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_user_credits', {
      p_user_id: userId
    });

    if (error) {
      console.error('[getUserCredits] RPC error:', error);
      return 0;
    }

    return typeof data === 'number' ? data : 0;
  } catch (err) {
    console.error('[getUserCredits] Exception:', err);
    return 0;
  }
}

/**
 * Type guard to check if a value is a valid CreditOperationResult
 */
export function isCreditOperationResult(value: unknown): value is CreditOperationResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.success === 'boolean' &&
    typeof obj.newBalance === 'number' &&
    (typeof obj.error === 'string' || obj.error === null)
  );
}

/**
 * Safely execute a credit operation and throw on failure
 * Use this when you want to fail fast on credit operation failures
 * 
 * @param params - The parameters for the credit operation
 * @returns Promise<number> - The new credit balance
 * @throws Error if the operation fails
 * 
 * @example
 * const newBalance = await addUserCreditsOrThrow({ userId: 'uuid', amount: 10 });
 */
export async function addUserCreditsOrThrow(params: AddUserCreditsParams): Promise<number> {
  const result = await addUserCredits(params);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update credits');
  }
  
  return result.newBalance;
}

/**
 * Convenience function to add credits and throw on failure
 */
export async function addCreditsOrThrow(
  userId: string, 
  amount: number, 
  reason?: string
): Promise<number> {
  return addUserCreditsOrThrow({ userId, amount: Math.abs(amount), reason });
}

/**
 * Convenience function to deduct credits and throw on failure
 */
export async function deductCreditsOrThrow(
  userId: string, 
  amount: number, 
  reason?: string
): Promise<number> {
  return addUserCreditsOrThrow({ userId, amount: -Math.abs(amount), reason });
}
