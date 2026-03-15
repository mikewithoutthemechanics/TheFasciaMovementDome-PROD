import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, ErrorCodes } from '../../utils/error-response';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// Public Classes (No authentication required)
// ============================================================================

router.get('/public', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const startDate = String(req.query.startDate || '');
    const endDate = String(req.query.endDate || '');
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase
      .from('classes')
      .select('*, venues(*), teachers(*)', { count: 'exact' })
      .eq('status', 'published');
    
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    
    if (endDate) {
      query = query.lte('end_time', endDate);
    }
    
    const offset = (page - 1) * limit;
    const { data: classes, error, count } = await query
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching public classes:', error);
      return res.status(500).json(errorResponse('Failed to fetch classes', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({
      classes: classes || [],
      pagination: {
        page: page,
        limit: limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching public classes:', error);
    res.status(500).json(errorResponse('Failed to fetch classes', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Get Single Class
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(errorResponse('Invalid class ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { data: classData, error } = await supabase
      .from('classes')
      .select('*, venues(*), teachers(*), registrations(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json(errorResponse('Class not found', ErrorCodes.NOT_FOUND));
      }
      console.error('Error fetching class:', error);
      return res.status(500).json(errorResponse('Failed to fetch class', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json(errorResponse('Failed to fetch class', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Create Class (Admin/Teacher only)
// ============================================================================

// SECURITY FIX: Add admin authentication
router.post('/', async (req: Request, res: Response) => {
    // Verify admin authentication
    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      venueId,
      teacherId,
      maxCapacity,
      price,
      status = 'draft'
    } = req.body;
    
    // Validation
    if (!title || !startTime || !endTime) {
      return res.status(400).json(errorResponse('Title, start time, and end time are required', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        venue_id: venueId,
        teacher_id: teacherId,
        max_capacity: maxCapacity || 20,
        price: price || 0,
        status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating class:', error);
      return res.status(500).json(errorResponse('Failed to create class', ErrorCodes.DATABASE_ERROR));
    }
    
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json(errorResponse('Failed to create class', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Update Class
// ============================================================================

// SECURITY FIX: Add admin authentication
router.put('/:id', async (req: Request, res: Response) => {
    // Verify admin authentication
    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;
  try {
    const id = String(req.params.id);
    const updates = req.body;
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(errorResponse('Invalid class ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating class:', error);
      return res.status(500).json(errorResponse('Failed to update class', ErrorCodes.DATABASE_ERROR));
    }
    
    if (!updatedClass) {
      return res.status(404).json(errorResponse('Class not found', ErrorCodes.NOT_FOUND));
    }
    
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json(errorResponse('Failed to update class', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Delete Class
// ============================================================================

// SECURITY FIX: Add admin authentication
router.delete('/:id', async (req: Request, res: Response) => {
    // Verify admin authentication
    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;
  try {
    const id = String(req.params.id);
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(errorResponse('Invalid class ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting class:', error);
      return res.status(500).json(errorResponse('Failed to delete class', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json(errorResponse('Failed to delete class', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Get Class Registrations
// ============================================================================

router.get('/:id/registrations', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const status = req.query.status ? String(req.query.status) : null;
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(errorResponse('Invalid class ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase
      .from('registrations')
      .select('*, users(*)')
      .eq('class_id', id);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: registrations, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching registrations:', error);
      return res.status(500).json(errorResponse('Failed to fetch registrations', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({ registrations: registrations || [] });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json(errorResponse('Failed to fetch registrations', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Get Class Feedback
// ============================================================================

router.get('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(errorResponse('Invalid class ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*, users(*)')
      .eq('class_id', id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching feedback:', error);
      return res.status(500).json(errorResponse('Failed to fetch feedback', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({ feedback: feedback || [] });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json(errorResponse('Failed to fetch feedback', ErrorCodes.INTERNAL_ERROR));
  }
});

export default router;
