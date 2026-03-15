import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, ErrorCodes } from '../../utils/error-response';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation helper
const isValidEmail = (value: unknown): value is string => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof value === 'string' && EMAIL_REGEX.test(value);
};

/**
 * POST /api/user/register
 * Create new user account (bypasses RLS)
 * SECURITY: Has strict rate limiting. Users cannot set admin privileges.
 */
router.post('/register', async (req, res) => {
  try {
    const { user } = req.body;
    
    if (!user?.id || !user?.email) {
      return res.status(400).json(errorResponse('Missing user id or email', ErrorCodes.VALIDATION_ERROR));
    }

    // Validate email format
    if (!isValidEmail(user.email)) {
      return res.status(400).json(errorResponse('Invalid email format', ErrorCodes.VALIDATION_ERROR));
    }

    // SECURITY: Prevent privilege escalation
    if (user.isAdmin === true) {
      console.warn(`[SECURITY] Registration with isAdmin=true blocked for: ${user.email}`);
      user.isAdmin = false;
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Build user object with safe defaults
    const userInsert = {
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      is_admin: false,
      credits: 0,
      waiver_accepted: false,
      waiver_data: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(userInsert, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[user register] database error:', error);
      return res.status(500).json(errorResponse('Failed to create user account', ErrorCodes.DATABASE_ERROR));
    }

    console.log(`[user register] Created user: ${user.email} (ID: ${user.id})`);
    res.json({ success: true, user: data });
  } catch (err) {
    console.error('[user register] error:', err);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

/**
 * POST /api/user/sync
 * Create/update user profile (bypasses RLS)
 * SECURITY: Requires authentication. Users can only update their own profile.
 */
router.post('/sync', async (req, res) => {
  try {
    const authUser = await requireAuth(req, res);
    if (!authUser) return;
    
    const { user } = req.body;
    
    if (!user?.id || !user?.email) {
      return res.status(400).json(errorResponse('Missing user id or email', ErrorCodes.VALIDATION_ERROR));
    }

    // SECURITY: Users can only update their own profile unless they are admin
    const isSelfUpdate = authUser.id === user.id;
    const canUpdateAdminStatus = authUser.isAdmin && !isSelfUpdate;
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Get existing user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Build update object
    const userUpdate: Record<string, unknown> = {
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      updated_at: new Date().toISOString()
    };

    // Only allow certain fields to be updated
    if (user.phone !== undefined) userUpdate.phone = user.phone;
    if (user.sport !== undefined) userUpdate.sport = user.sport;
    if (user.movement_experience !== undefined) userUpdate.movement_experience = user.movement_experience;
    if (user.primary_body_areas !== undefined) userUpdate.primary_body_areas = user.primary_body_areas;
    if (user.injury_history !== undefined) userUpdate.injury_history = user.injury_history;
    if (user.goals !== undefined) userUpdate.goals = user.goals;
    
    // Admin fields - only admins can update these
    if (canUpdateAdminStatus) {
      if (user.is_admin !== undefined) userUpdate.is_admin = user.is_admin;
      if (user.admin_role !== undefined) userUpdate.admin_role = user.admin_role;
      if (user.credits !== undefined) userUpdate.credits = user.credits;
    } else {
      // Preserve existing admin fields
      if (existingUser) {
        userUpdate.is_admin = existingUser.is_admin;
        userUpdate.admin_role = existingUser.admin_role;
        userUpdate.credits = existingUser.credits;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(userUpdate, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[user sync] database error:', error);
      return res.status(500).json(errorResponse('Failed to sync user', ErrorCodes.DATABASE_ERROR));
    }

    console.log(`[user sync] Synced user: ${user.email} (ID: ${user.id})`);
    res.json({ success: true, user: data });
  } catch (err) {
    console.error('[user sync] error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export default router;
