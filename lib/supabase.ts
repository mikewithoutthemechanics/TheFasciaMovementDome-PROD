// lib/supabase.ts - Auth utilities
// Local implementations with proper configuration checking

import { supabase, isConfigured } from '../services/supabase-client';
import type { User } from '../types';

// Re-export supabase client and isConfigured (non-conflicting)
export { supabase, isConfigured } from '../services/supabase-client';

// Re-create isSupabaseConfigured for backwards compatibility
export const isSupabaseConfigured = (): boolean => isConfigured();

// Google OAuth Sign In
export const signInWithGoogle = async (): Promise<{ user: User | null; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase is not configured. Please set up your environment variables.' };
  }

  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: null, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }
};

// Facebook OAuth Sign In
export const signInWithFacebook = async (): Promise<{ user: User | null; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase is not configured. Please set up your environment variables.' };
  }

  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: null, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }
};

// Apple OAuth Sign In
export const signInWithApple = async (): Promise<{ user: User | null; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase is not configured. Please set up your environment variables.' };
  }

  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: null, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }
};

// Exchange auth code for session (for magic link/OTP flow)
export const exchangeCodeForSession = async (code: string): Promise<{ success: boolean; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Error exchanging code:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Get current session user
export const getCurrentUser = async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    const { user } = session;
    
    return {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      isAdmin: false,
      waiverAccepted: false,
    };
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
};

// Sign out
export const signOut = async (): Promise<{ error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }
};

// Magic Link Sign In
export const signInWithMagicLink = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured. Please set up your environment variables.' };
  }

  try {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }
};

// Listen for auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!isSupabaseConfigured()) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const user: User = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        isAdmin: false,
        waiverAccepted: false,
      };
      callback(user);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
};
