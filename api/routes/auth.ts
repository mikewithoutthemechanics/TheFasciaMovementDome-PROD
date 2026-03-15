import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { errorResponse, ErrorCodes } from '../../utils/error-response';

const router = Router();

// Get Supabase URL and key from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// CSRF Token Endpoint
// ============================================================================

router.get('/csrf-token', (_req: Request, res: Response) => {
  try {
    // Generate a random CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Store in session if using sessions, or set as a cookie
    res.cookie('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    
    res.json({ csrfToken });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json(errorResponse('Failed to generate CSRF token', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Google OAuth Callback
// ============================================================================

router.post('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, redirect_uri } = req.body;
    
    if (!code) {
      return res.status(400).json(errorResponse('Authorization code is required', ErrorCodes.VALIDATION_ERROR));
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirect_uri || `${process.env.FRONTEND_URL}/auth/callback`,
        grant_type: 'authorization_code'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Google token exchange failed:', errorData);
      return res.status(400).json(errorResponse('Failed to exchange authorization code', ErrorCodes.AUTHENTICATION_ERROR));
    }
    
    const tokens = await tokenResponse.json();
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    if (!userResponse.ok) {
      return res.status(400).json(errorResponse('Failed to get user info from Google', ErrorCodes.AUTHENTICATION_ERROR));
    }
    
    const googleUser = await userResponse.json();
    
    // Create or update user in Supabase
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Check if user exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, credits, teacher_status')
      .eq('email', googleUser.email)
      .single();
    
    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('Error looking up user:', lookupError);
      return res.status(500).json(errorResponse('Database error', ErrorCodes.DATABASE_ERROR));
    }
    
    let user;
    if (existingUser) {
      user = existingUser;
      // Update Google ID if not set
      const { error: updateError } = await supabase
        .from('users')
        .update({ google_id: googleUser.id, updated_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('Error updating user Google ID:', updateError);
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: googleUser.email,
          first_name: googleUser.given_name || '',
          last_name: googleUser.family_name || '',
          google_id: googleUser.id,
          role: 'client',
          credits: 0,
          teacher_status: 'none'
        })
        .select('id, email, first_name, last_name, role, credits, teacher_status')
        .single();
      
      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json(errorResponse('Failed to create user', ErrorCodes.DATABASE_ERROR));
      }
      
      user = newUser;
    }
    
    res.json({
      user,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      }
    });
    
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json(errorResponse('Authentication failed', ErrorCodes.INTERNAL_ERROR));
  }
});

// ============================================================================
// Google Sign-In (Direct Token Verification)
// ============================================================================

router.post('/google/signin', async (req: Request, res: Response) => {
  try {
    const { idToken, accessToken } = req.body;
    
    if (!idToken && !accessToken) {
      return res.status(400).json(errorResponse('ID token or access token is required', ErrorCodes.VALIDATION_ERROR));
    }
    
    let googleUser;
    
    if (idToken) {
      // Verify ID token
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!response.ok) {
        return res.status(401).json(errorResponse('Invalid ID token', ErrorCodes.AUTHENTICATION_ERROR));
      }
      googleUser = await response.json();
      
      // Verify audience
      if (googleUser.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json(errorResponse('Invalid token audience', ErrorCodes.AUTHENTICATION_ERROR));
      }
    } else {
      // Use access token to get user info
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        return res.status(401).json(errorResponse('Invalid access token', ErrorCodes.AUTHENTICATION_ERROR));
      }
      
      googleUser = await response.json();
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Check if user exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, credits, teacher_status')
      .eq('email', googleUser.email)
      .single();
    
    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('Error looking up user:', lookupError);
      return res.status(500).json(errorResponse('Database error', ErrorCodes.DATABASE_ERROR));
    }
    
    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: googleUser.email,
          first_name: googleUser.given_name || googleUser.name?.split(' ')[0] || '',
          last_name: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
          google_id: googleUser.id,
          role: 'client',
          credits: 0,
          teacher_status: 'none'
        })
        .select('id, email, first_name, last_name, role, credits, teacher_status')
        .single();
      
      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json(errorResponse('Failed to create user', ErrorCodes.DATABASE_ERROR));
      }
      
      user = newUser;
    }
    
    res.json({ user });
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json(errorResponse('Authentication failed', ErrorCodes.INTERNAL_ERROR));
  }
});

export default router;
