import { Application } from 'express';
import userRoutes from './users';
import classRoutes from './classes';
import bookingRoutes from './bookings';
import teacherRoutes from './teachers';
import authRoutes from './auth';
import paymentRoutes from './payments';
import adminRoutes from './admin';
import reportRoutes from './reports';

/**
 * Register all API routes with the Express application
 * 
 * Route structure:
 * - /api/user/* - User management
 * - /api/classes/* - Class management
 * - /api/registration/* - Booking/registration management
 * - /api/teacher/* - Teacher approval workflow
 * - /api/auth/* - Authentication (Google OAuth)
 * - /api/payments/* - Payments and credits
 * - /api/admin/* - Admin operations
 * - /api/reports/* - Reports and analytics
 */
export function registerRoutes(app: Application): void {
  // User routes
  app.use('/api/user', userRoutes);
  
  // Class routes (includes /api/public/classes for unauthenticated access)
  app.use('/api/classes', classRoutes);
  
  // Registration/booking routes
  app.use('/api/registration', bookingRoutes);
  
  // Teacher routes
  app.use('/api/teacher', teacherRoutes);
  
  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Payment routes
  app.use('/api/payments', paymentRoutes);
  
  // Legacy PayFast endpoint (for backward compatibility)
  app.use('/api/payfast', paymentRoutes);
  
  // Admin routes
  app.use('/api/admin', adminRoutes);
  
  // Report routes
  app.use('/api/reports', reportRoutes);
}

export {
  userRoutes,
  classRoutes,
  bookingRoutes,
  teacherRoutes,
  authRoutes,
  paymentRoutes,
  adminRoutes,
  reportRoutes
};
