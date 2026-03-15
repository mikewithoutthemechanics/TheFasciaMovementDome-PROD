import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, ErrorCodes } from '../../utils/error-response';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Validation helper
const isValidUUID = (value: unknown): value is string => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && UUID_REGEX.test(value);
};

/**
 * POST /api/teacher/request
 * Submit teacher registration request
 */
router.post('/request', async (req, res) => {
  try {
    const { userId, name, email, phone, qualifications, experience, specializations } = req.body;

    if (!userId || !name || !email) {
      return res.status(400).json(errorResponse('Missing required fields: userId, name, email', ErrorCodes.VALIDATION_ERROR));
    }

    if (!isValidUUID(userId)) {
      return res.status(400).json(errorResponse('Invalid userId format', ErrorCodes.VALIDATION_ERROR));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    const { data: request, error } = await supabaseAdmin
      .from('teacher_requests')
      .insert({
        user_id: userId,
        email,
        name,
        phone: phone || null,
        qualifications: qualifications || null,
        experience: experience || null,
        specializations: specializations || [],
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[teacher request] error:', error);
      return res.status(500).json(errorResponse('Failed to create teacher request', ErrorCodes.DATABASE_ERROR));
    }

    // Update user teacher_status to pending
    await supabaseAdmin
      .from('users')
      .update({ teacher_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', userId);

    res.json({ success: true, request });
  } catch (err) {
    console.error('[teacher request] error:', err);
    res.status(500).json({ error: 'Failed to create teacher request' });
  }
});

/**
 * GET /api/teacher/pending
 * Get pending teacher requests (admin only)
 */
router.get('/pending', async (req, res) => {
  try {
    const authUser = await requireAdmin(req, res);
    if (!authUser) return;

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    const { data: requests, error } = await supabaseAdmin
      .from('teacher_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[teacher pending] error:', error);
      return res.status(500).json(errorResponse('Failed to fetch pending requests', ErrorCodes.DATABASE_ERROR));
    }

    res.json({ requests: requests || [] });
  } catch (err) {
    console.error('[teacher pending] error:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

/**
 * POST /api/teacher/approve
 * Approve a teacher request (admin only)
 */
router.post('/approve', async (req, res) => {
  try {
    const authUser = await requireAdmin(req, res);
    if (!authUser) return;

    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json(errorResponse('Missing requestId', ErrorCodes.VALIDATION_ERROR));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Get the request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('teacher_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json(errorResponse('Teacher request not found', ErrorCodes.NOT_FOUND));
    }

    // Update request status
    await supabaseAdmin
      .from('teacher_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    // Update user role to teacher
    await supabaseAdmin
      .from('users')
      .update({ role: 'teacher', teacher_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', request.user_id);

    // Create teacher record
    await supabaseAdmin
      .from('teachers')
      .insert({
        user_id: request.user_id,
        email: request.email,
        name: request.name,
        phone: request.phone,
        qualifications: request.qualifications,
        experience: request.experience,
        specializations: request.specializations,
        active: true
      });

    res.json({ success: true, message: 'Teacher approved' });
  } catch (err) {
    console.error('[teacher approve] error:', err);
    res.status(500).json({ error: 'Failed to approve teacher' });
  }
});

/**
 * POST /api/teacher/reject
 * Reject a teacher request (admin only)
 */
router.post('/reject', async (req, res) => {
  try {
    const authUser = await requireAdmin(req, res);
    if (!authUser) return;

    const { requestId, reason } = req.body;
    if (!requestId) {
      return res.status(400).json(errorResponse('Missing requestId', ErrorCodes.VALIDATION_ERROR));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Get the request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('teacher_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json(errorResponse('Teacher request not found', ErrorCodes.NOT_FOUND));
    }

    // Update request status
    await supabaseAdmin
      .from('teacher_requests')
      .update({ status: 'rejected', rejection_reason: reason || null, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    // Update user teacher_status
    await supabaseAdmin
      .from('users')
      .update({ teacher_status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', request.user_id);

    res.json({ success: true, message: 'Teacher request rejected' });
  } catch (err) {
    console.error('[teacher reject] error:', err);
    res.status(500).json({ error: 'Failed to reject teacher request' });
  }
});

/**
 * GET /api/teacher/status/:userId
 * Get teacher request status for a user
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!isValidUUID(userId)) {
      return res.status(400).json(errorResponse('Invalid userId format', ErrorCodes.VALIDATION_ERROR));
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    const { data: request, error } = await supabaseAdmin
      .from('teacher_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[teacher status] error:', error);
      return res.status(500).json(errorResponse('Failed to fetch teacher status', ErrorCodes.DATABASE_ERROR));
    }

    res.json({ request });
  } catch (err) {
    console.error('[teacher status] error:', err);
    res.status(500).json({ error: 'Failed to fetch teacher status' });
  }
});

/**
 * GET /api/teacher/summary
 * Get teacher summary statistics (admin only)
 */
router.get('/summary', async (req, res) => {
  try {
    const authUser = await requireAdmin(req, res);
    if (!authUser) return;

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    // Get total teachers count
    const { count: totalTeachers, error: totalError } = await supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true });

    // Get active teachers count
    const { count: activeTeachers, error: activeError } = await supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    // Get pending teacher requests count
    const { count: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('teacher_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get approved teacher requests count
    const { count: approvedRequests, error: approvedError } = await supabaseAdmin
      .from('teacher_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Get rejected teacher requests count
    const { count: rejectedRequests, error: rejectedError } = await supabaseAdmin
      .from('teacher_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    if (totalError || activeError || pendingError || approvedError || rejectedError) {
      console.error('[teacher summary] error:', { totalError, activeError, pendingError, approvedError, rejectedError });
      return res.status(500).json(errorResponse('Failed to fetch teacher summary', ErrorCodes.DATABASE_ERROR));
    }

    res.json({
      summary: {
        totalTeachers: totalTeachers || 0,
        activeTeachers: activeTeachers || 0,
        pendingRequests: pendingRequests || 0,
        approvedRequests: approvedRequests || 0,
        rejectedRequests: rejectedRequests || 0
      }
    });
  } catch (err) {
    console.error('[teacher summary] error:', err);
    res.status(500).json({ error: 'Failed to fetch teacher summary' });
  }
});

export default router;
