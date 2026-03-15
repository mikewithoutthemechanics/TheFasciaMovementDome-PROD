import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { errorResponse, ErrorCodes } from '../../utils/error-response';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// Security Helper Functions
// ============================================================================

/**
 * Escape SQL wildcard characters (% and _) in user search input
 * to prevent SQL injection and unexpected query behavior
 */
function escapeSearchInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Escape SQL LIKE wildcards
  return input.replace(/[%_]/g, '\\$&');
}

// ============================================================================
// Admin Verification Middleware (now uses centralized auth middleware)
// ============================================================================

// Admin verification and requireAdmin are now imported from ../middleware/auth.ts
// They handle is_admin, isAdmin, and role === 'admin' consistently

// ============================================================================
// Admin Verification Endpoint
// ============================================================================

router.get('/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    // This endpoint returns the authenticated admin user info
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: { user } } = await supabase.auth.getUser(token!);
    
    if (!user) {
      return res.status(404).json(errorResponse('User not found', ErrorCodes.NOT_FOUND));
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, is_admin, role')
      .eq('id', user.id)
      .single();
    
    res.json({ 
      isAdmin: userData?.is_admin === true || userData?.role === 'admin',
      user: userData
    });
  } catch (error) {
    console.error('Admin verify error:', error);
    res.status(500).json(errorResponse('Verification failed', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Admin Invite Endpoint
// ============================================================================

router.post('/invite', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, role = 'admin' } = req.body;
    
    if (!email) {
      return res.status(400).json(errorResponse('Email is required', ErrorCodes.VALIDATION_ERROR));
    }
    
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json(errorResponse('Invalid email format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Check if user already exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();
    
    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('Error looking up user:', lookupError);
      return res.status(500).json(errorResponse('Database error', ErrorCodes.DATABASE_ERROR));
    }
    
    if (existingUser) {
      // Update existing user to admin
      const { error: updateError } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('Error updating user role:', updateError);
        return res.status(500).json(errorResponse('Failed to update user role', ErrorCodes.DATABASE_ERROR));
      }
      
      return res.json({
        success: true,
        message: `User ${email} has been promoted to ${role}`,
        userId: existingUser.id
      });
    }
    
    // Create invitation record
    const inviteToken = crypto.randomUUID();
    
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .insert({
        email,
        role,
        token: inviteToken,
        invited_by: req.headers['x-user-id'] || 'system',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return res.status(500).json(errorResponse('Failed to create invitation', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteToken,
      expiresAt: invite.expires_at
    });
    
  } catch (error) {
    console.error('Admin invite error:', error);
    res.status(500).json(errorResponse('Failed to send invitation', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Admin Dashboard Stats
// ============================================================================

router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get user counts
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: teacherCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
    const { count: pendingTeachers } = await supabase.from('teacher_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    
    // Get class counts
    const { count: totalClasses } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    const { count: upcomingClasses } = await supabase.from('classes').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString());
    
    // Get registration counts
    const { count: totalRegistrations } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
    
    res.json({
      users: { total: totalUsers || 0, teachers: teacherCount || 0, pendingTeachers: pendingTeachers || 0 },
      classes: { total: totalClasses || 0, upcoming: upcomingClasses || 0 },
      registrations: { total: totalRegistrations || 0 }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json(errorResponse('Failed to get stats', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// User Management
// ============================================================================

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const role = req.query.role;
    const search = req.query.search;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, credits, teacher_status, created_at, updated_at', { count: 'exact' });
    
    if (role) {
      query = query.eq('role', role);
    }
    
    if (search) {
      // Escape SQL wildcards in user input to prevent injection
      const safeSearch = escapeSearchInput(String(search));
      const searchPattern = `%${safeSearch}%`;
      query = query.or(`email.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`);
    }
    
    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json(errorResponse('Failed to fetch users', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({
      users,
      pagination: {
        page: page,
        limit: limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json(errorResponse('Failed to fetch users', ErrorCodes.INTERNAL_ERROR));
  }
});

router.put('/users/:userId/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const { role } = req.body;
    
    if (!role || !['client', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json(errorResponse('Valid role is required', ErrorCodes.VALIDATION_ERROR));
    }
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(userId)) {
      return res.status(400).json(errorResponse('Invalid user ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: user, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, first_name, last_name, role')
      .single();
    
    if (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json(errorResponse('Failed to update user role', ErrorCodes.DATABASE_ERROR));
    }
    
    if (!user) {
      return res.status(404).json(errorResponse('User not found', ErrorCodes.NOT_FOUND));
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json(errorResponse('Failed to update user role', ErrorCodes.INTERNAL_ERROR));
  }
});

export default router;
