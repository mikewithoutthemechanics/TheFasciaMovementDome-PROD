import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  adminRole?: string;
}

/**
 * Verify authentication from request headers
 */
export async function verifyAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  if (!token) {
    return null;
  }
  
  // Use connection pooler for serverless
  const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const poolerUrl = baseUrl.includes('pgbouncer') 
    ? baseUrl 
    : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}pgbouncer=transaction`;
  
  const supabaseAdmin = createClient(poolerUrl, process.env.SUPABASE_SERVICE_KEY || '');
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  // Get user from database to check admin status
  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('id, email, is_admin, admin_role')
    .eq('id', user.id)
    .single();
  
  if (!dbUser) {
    return null;
  }
  
  return {
    id: dbUser.id,
    email: dbUser.email,
    isAdmin: dbUser.is_admin || false,
    adminRole: dbUser.admin_role
  };
}

/**
 * Require authentication middleware
 */
export async function requireAuth(req: Request, res: Response): Promise<AuthUser | null> {
  const user = await verifyAuth(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return user;
}

/**
 * Check if user has admin privileges
 * Returns true if user.isAdmin === true OR user.is_admin === true OR user.role === 'admin'
 */
export function isUserAdmin(user: { is_admin?: boolean; isAdmin?: boolean; role?: string }): boolean {
  return user.is_admin === true || user.isAdmin === true || user.role === 'admin';
}

/**
 * Require admin - throws error if not admin
 */
export function requireAdminUser(user: { is_admin?: boolean; isAdmin?: boolean; role?: string }): void {
  if (!isUserAdmin(user)) {
    throw new Error('Admin access required');
  }
}

/**
 * Require admin authentication middleware
 */
export async function requireAdmin(req: Request, res: Response): Promise<AuthUser | null> {
  const user = await verifyAuth(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (!user.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}
