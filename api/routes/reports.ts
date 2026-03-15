import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, ErrorCodes } from '../../utils/error-response';
import { emailService } from '../../services/email';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// Analytics Endpoints
// ============================================================================

router.get('/analytics/overview', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get counts
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    const { count: registrationCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
    
    // Get recent registrations
    const { data: recentRegistrations } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    res.json({
      counts: {
        users: userCount || 0,
        classes: classCount || 0,
        registrations: registrationCount || 0
      },
      recentRegistrations: recentRegistrations || []
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json(errorResponse('Failed to get analytics', ErrorCodes.INTERNAL_ERROR));
  }
});

router.get('/analytics/revenue', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get payment logs
    const { data: payments, error } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to get revenue data', ErrorCodes.DATABASE_ERROR));
    }
    
    // Calculate totals
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalCredits = payments?.reduce((sum, p) => sum + (p.credits || 0), 0) || 0;
    
    res.json({
      totalRevenue,
      totalCredits,
      payments: payments || []
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json(errorResponse('Failed to get revenue analytics', ErrorCodes.INTERNAL_ERROR));
  }
});

router.get('/analytics/classes', async (req: Request, res: Response) => {
  try {
    const { teacherId, startDate, endDate } = req.query;
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase.from('classes').select('*');
    
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    
    if (endDate) {
      query = query.lte('end_time', endDate);
    }
    
    const { data: classes, error } = await query.order('start_time', { ascending: false });
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to get class analytics', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({ classes: classes || [] });
  } catch (error) {
    console.error('Class analytics error:', error);
    res.status(500).json(errorResponse('Failed to get class analytics', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Feedback Endpoints
// ============================================================================

router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const { classId, teacherId, page = 1, limit = 20 } = req.query;
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase.from('feedback').select('*');
    
    if (classId) {
      query = query.eq('class_id', classId);
    }
    
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    
    const { data: feedback, error } = await query
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to get feedback', ErrorCodes.DATABASE_ERROR));
    }
    
    res.json({ feedback: feedback || [], page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json(errorResponse('Failed to get feedback', ErrorCodes.INTERNAL_ERROR));
  }
});

router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { classId, rating, comment, userId } = req.body;
    
    if (!classId || !rating || !userId) {
      return res.status(400).json(errorResponse('Class ID, rating, and user ID are required', ErrorCodes.VALIDATION_ERROR));
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json(errorResponse('Rating must be between 1 and 5', ErrorCodes.VALIDATION_ERROR));
    }
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(classId) || !UUID_REGEX.test(userId)) {
      return res.status(400).json(errorResponse('Invalid ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        class_id: classId,
        user_id: userId,
        rating,
        comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to create feedback', ErrorCodes.DATABASE_ERROR));
    }
    
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json(errorResponse('Failed to create feedback', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Export Reports
// ============================================================================

router.get('/export/bookings', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase.from('registrations').select('*, classes(*), users(*)', { count: 'exact' });
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: bookings, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to export bookings', ErrorCodes.DATABASE_ERROR));
    }
    
    if (format === 'csv') {
      // Simple CSV conversion
      const headers = 'ID,User,Class,Status,Created At\n';
      const rows = (bookings || []).map(b => `${b.id},${b.user_id},${b.class_id},${b.status},${b.created_at}`).join('\n');
      const csv = headers + rows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
      return res.send(csv);
    }
    
    res.json({ 
      data: bookings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json(errorResponse('Failed to export bookings', ErrorCodes.INTERNAL_ERROR));
  }
});

router.get('/export/revenue', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase.from('payment_logs').select('*', { count: 'exact' }).eq('status', 'completed');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: payments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to export revenue', ErrorCodes.DATABASE_ERROR));
    }
    
    if (format === 'csv') {
      const headers = 'Payment ID,User ID,Amount,Credits,Date\n';
      const rows = (payments || []).map(p => `${p.payment_id},${p.user_id},${p.amount},${p.credits},${p.created_at}`).join('\n');
      const csv = headers + rows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=revenue.csv');
      return res.send(csv);
    }
    
    res.json({ 
      data: payments || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Export revenue error:', error);
    res.status(500).json(errorResponse('Failed to export revenue', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Export Feedback
// ============================================================================

router.get('/export/feedback', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type, format = 'json' } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    let query = supabase.from('feedback').select('*, classes(title), users(name, email), teachers(name, email)', { count: 'exact' });
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    
    const { data: feedback, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      return res.status(500).json(errorResponse('Failed to export feedback', ErrorCodes.DATABASE_ERROR));
    }
    
    if (format === 'csv') {
      const headers = 'ID,Type,User Name,User Email,Class,Teacher,Rating,NPS Score,Comment,Created At\n';
      const escapeCsv = (val: string | null | undefined) => {
        if (val === null || val === undefined) return '';
        return `"${String(val).replace(/"/g, '""')}"`;
      };
      const rows = (feedback || []).map(f => [
        escapeCsv(f.id),
        escapeCsv(f.type),
        escapeCsv(f.user_name),
        escapeCsv(f.users?.email || f.user_email),
        escapeCsv(f.classes?.title),
        escapeCsv(f.teachers?.name),
        f.rating || '',
        f.nps_score || '',
        escapeCsv(f.comment),
        escapeCsv(f.created_at)
      ].join(',')).join('\n');
      const csv = headers + rows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=feedback_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }
    
    res.json({ 
      data: feedback || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Export feedback error:', error);
    res.status(500).json(errorResponse('Failed to export feedback', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Send Feedback to Teacher
// ============================================================================

router.post('/feedback/send-to-teacher', async (req: Request, res: Response) => {
  try {
    const { feedbackId, teacherId } = req.body;
    
    if (!feedbackId || !teacherId) {
      return res.status(400).json(errorResponse('Feedback ID and Teacher ID are required', ErrorCodes.VALIDATION_ERROR));
    }
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(feedbackId) || !UUID_REGEX.test(teacherId)) {
      return res.status(400).json(errorResponse('Invalid ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get feedback with class info
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*, classes(title), users(name, email)')
      .eq('id', feedbackId)
      .single();
    
    if (feedbackError || !feedback) {
      return res.status(404).json(errorResponse('Feedback not found', ErrorCodes.NOT_FOUND));
    }
    
    // Get teacher info
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('name, email')
      .eq('id', teacherId)
      .single();
    
    if (teacherError || !teacher) {
      return res.status(404).json(errorResponse('Teacher not found', ErrorCodes.NOT_FOUND));
    }
    
    // Send email to teacher
    const emailResult = await emailService.sendFeedbackNotification({
      to: teacher.email,
      teacherName: teacher.name,
      studentName: feedback.users?.name || feedback.user_name,
      classTitle: feedback.classes?.title || undefined,
      rating: feedback.rating || undefined,
      npsScore: feedback.nps_score || undefined,
      comment: feedback.comment || undefined,
      feedbackType: feedback.type,
    });
    
    if (!emailResult.success) {
      return res.status(500).json(errorResponse('Failed to send email', ErrorCodes.EMAIL_ERROR));
    }
    
    // Update feedback with teacher_id
    await supabase
      .from('feedback')
      .update({ teacher_id: teacherId })
      .eq('id', feedbackId);
    
    res.json({ success: true, message: 'Feedback sent to teacher' });
  } catch (error) {
    console.error('Send feedback to teacher error:', error);
    res.status(500).json(errorResponse('Failed to send feedback to teacher', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Teacher Reports
// ============================================================================

router.get('/teacher/:teacherId/summary', async (req: Request, res: Response) => {
  try {
    const teacherId = String(req.params.teacherId);
    const { startDate, endDate } = req.query;
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(teacherId)) {
      return res.status(400).json(errorResponse('Invalid teacher ID format', ErrorCodes.VALIDATION_ERROR));
    }
    
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get teacher's classes
    let classQuery = supabase.from('classes').select('*').eq('teacher_id', teacherId);
    
    if (startDate) {
      classQuery = classQuery.gte('start_time', startDate);
    }
    
    if (endDate) {
      classQuery = classQuery.lte('end_time', endDate);
    }
    
    const { data: classes, error: classError } = await classQuery;
    
    if (classError) {
      return res.status(500).json(errorResponse('Failed to get teacher summary', ErrorCodes.DATABASE_ERROR));
    }
    
    // Get registrations for these classes
    const classIds = (classes || []).map(c => c.id);
    const { data: registrations } = await supabase
      .from('registrations')
      .select('*')
      .in('class_id', classIds.length > 0 ? classIds : ['']);
    
    res.json({
      teacherId,
      classCount: classes?.length || 0,
      registrationCount: registrations?.length || 0,
      classes: classes || [],
      registrations: registrations || []
    });
  } catch (error) {
    console.error('Teacher summary error:', error);
    res.status(500).json(errorResponse('Failed to get teacher summary', ErrorCodes.INTERNAL_ERROR));
  }
});

export default router;
