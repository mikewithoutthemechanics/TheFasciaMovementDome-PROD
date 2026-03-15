import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, ErrorCodes } from '../../utils/error-response';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/registration/sync
 * Create registration (bypasses RLS)
 * SECURITY: Requires authentication. Users can only register themselves.
 */
router.post('/sync', async (req, res) => {
  try {
    const authUser = await requireAuth(req, res);
    if (!authUser) return;
    
    const { registration } = req.body;
    
    if (!registration?.id || !registration?.classId || !registration?.userId) {
      return res.status(400).json(errorResponse('Missing required registration fields', ErrorCodes.VALIDATION_ERROR));
    }

    // SECURITY: Users can only register themselves unless they are admin
    const canRegisterOther = authUser.isAdmin;
    if (!canRegisterOther && authUser.id !== registration.userId) {
      console.warn(`[SECURITY] User ${authUser.id} attempted to register for user ${registration.userId}`);
      return res.status(403).json(errorResponse('You can only register yourself for classes', ErrorCodes.FORBIDDEN));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Use atomic database function to prevent race conditions
    const { data: result, error: funcError } = await supabaseAdmin.rpc('register_for_class', {
      p_class_id: registration.classId,
      p_user_id: registration.userId,
      p_registration_id: registration.id
    });

    if (funcError) {
      console.error('[registration sync] function error:', funcError);
      return res.status(500).json(errorResponse('Failed to create registration', ErrorCodes.DATABASE_ERROR));
    }

    if (!result?.success) {
      if (result?.error === 'already_registered') {
        return res.status(409).json(errorResponse('Already registered for this class', ErrorCodes.ALREADY_EXISTS));
      }
      if (result?.error === 'class_not_found') {
        return res.status(404).json(errorResponse('Class not found', ErrorCodes.NOT_FOUND));
      }
      return res.status(400).json(errorResponse('Registration failed', ErrorCodes.VALIDATION_ERROR));
    }

    // Fetch the created registration to return full object
    const { data: newReg } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration.id)
      .single();

    res.json({ success: true, registration: newReg, waitlisted: result.waitlisted });
  } catch (err) {
    console.error('[registration sync] error:', err);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

/**
 * POST /api/registration/cancel
 * Cancel registration (bypasses RLS)
 * SECURITY: Requires authentication. Users can only cancel their own registrations.
 */
router.post('/cancel', async (req, res) => {
  try {
    const authUser = await requireAuth(req, res);
    if (!authUser) return;
    
    const { registrationId } = req.body;
    
    if (!registrationId) {
      return res.status(400).json(errorResponse('Missing registrationId', ErrorCodes.VALIDATION_ERROR));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Get the registration
    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('*, classes(*)')
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      return res.status(404).json(errorResponse('Registration not found', ErrorCodes.NOT_FOUND));
    }

    // SECURITY: Users can only cancel their own registrations unless admin
    if (!authUser.isAdmin && authUser.id !== registration.user_id) {
      console.warn(`[SECURITY] User ${authUser.id} attempted to cancel registration for user ${registration.user_id}`);
      return res.status(403).json(errorResponse('You can only cancel your own registrations', ErrorCodes.FORBIDDEN));
    }

    // Update registration status
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', registrationId);

    if (updateError) {
      console.error('[registration cancel] error:', updateError);
      return res.status(500).json(errorResponse('Failed to cancel registration', ErrorCodes.DATABASE_ERROR));
    }

    // If there are waitlisted users, promote the first one
    if (registration.status === 'confirmed' || registration.status === 'registered') {
      const { data: waitlisted } = await supabaseAdmin
        .from('registrations')
        .select('*')
        .eq('class_id', registration.class_id)
        .eq('status', 'waitlisted')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (waitlisted) {
        await supabaseAdmin
          .from('registrations')
          .update({ status: 'registered', updated_at: new Date().toISOString() })
          .eq('id', waitlisted.id);
      }
    }

    res.json({ success: true, message: 'Registration cancelled' });
  } catch (err) {
    console.error('[registration cancel] error:', err);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

/**
 * GET /api/registration/user/:userId
 * Get user's registrations
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const authUser = await requireAuth(req, res);
    if (!authUser) return;

    // SECURITY: Users can only view their own registrations unless admin
    if (!authUser.isAdmin && authUser.id !== userId) {
      return res.status(403).json(errorResponse('You can only view your own registrations', ErrorCodes.FORBIDDEN));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    const { data: registrations, error } = await supabaseAdmin
      .from('registrations')
      .select('*, classes(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[registration user] error:', error);
      return res.status(500).json(errorResponse('Failed to fetch registrations', ErrorCodes.DATABASE_ERROR));
    }

    res.json({ registrations: registrations || [] });
  } catch (err) {
    console.error('[registration user] error:', err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

export default router;
