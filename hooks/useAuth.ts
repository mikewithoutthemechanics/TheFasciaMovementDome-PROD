import { useState, useEffect, useCallback } from 'react';
import { User, AppState, WaiverData, InjuryRecord } from '../types';
import { getCurrentUser, onAuthStateChange, signOut, isSupabaseConfigured, exchangeCodeForSession } from '../lib/supabase';
import { db } from '../services/db-supabase';

/**
 * Auto-logout timeout in milliseconds (5 minutes)
 */
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

/**
 * Syncs a user to the server to bypass RLS policies
 * @param user - The user object to sync
 */
const syncUserToServer = async (user: User): Promise<void> => {
  try {
    const response = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (!response.ok) {
      console.error('[syncUserToServer] failed:', response.statusText);
    }
  } catch (err) {
    console.error('[syncUserToServer] error:', err);
  }
};

/**
 * Interface for the useAuth hook return value
 */
export interface UseAuthReturn {
  /** Current user or null if not authenticated */
  user: User | null;
  /** Current app state (signin, onboarding, client, admin, teacher) */
  appState: AppState;
  /** Current auth screen (landing, client, teacher, admin) */
  authScreen: 'landing' | 'client' | 'teacher' | 'admin';
  /** Whether auth is being checked (e.g., during magic link exchange) */
  authChecking: boolean;
  /** Handle sign in */
  handleSignIn: () => Promise<void>;
  /** Handle manual sign up */
  handleManualSignUp: (name: string, email: string) => Promise<void>;
  /** Handle sign out */
  handleSignOut: () => Promise<void>;
  /** Handle onboarding completion */
  handleOnboardingComplete: (waiverData: WaiverData, injuries: InjuryRecord[]) => Promise<void>;
  /** Set app state */
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  /** Set auth screen */
  setAuthScreen: React.Dispatch<React.SetStateAction<'landing' | 'client' | 'teacher' | 'admin'>>;
}

/**
 * Custom hook for authentication state and handlers
 * 
 * Manages:
 * - User state
 * - App state (signin, onboarding, client, admin, teacher)
 * - Auth screen state
 * - Auth state change listener
 * - Sign in, sign up, sign out, and onboarding completion handlers
 * 
 * @returns Object containing auth state and handler functions
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('signin');
  const [authScreen, setAuthScreen] = useState<'landing' | 'client' | 'teacher' | 'admin'>('landing');
  const [authChecking, setAuthChecking] = useState(false);

  /**
   * Handle sign in - authenticates with Supabase and syncs user data
   */
  const handleSignIn = useCallback(async () => {
    try {
      const supabaseUser = await getCurrentUser();
      
      if (!supabaseUser) {
        console.warn('[App] No authenticated user found');
        return;
      }
      
      const existingUsers = await db.getUsers();
      let currentUser = existingUsers.find(u => u.email === supabaseUser.email);

      if (!currentUser) {
        currentUser = {
          id: supabaseUser.id,
          name: supabaseUser.name,
          email: supabaseUser.email,
          isAdmin: false,
          waiverAccepted: false
        };
        await syncUserToServer(currentUser);
      }
      
      setUser(currentUser);
      
      const hasSignedWaiver = currentUser.waiverData?.signed || currentUser.waiverAccepted;

      if (!hasSignedWaiver) {
        setAppState('onboarding');
      } else {
        setAppState('client');
      }
    } catch (err) {
      console.error('Failed to sign in:', err);
    }
  }, []);

  /**
   * Handle manual sign up - creates a new user account
   * @param name - User's name
   * @param email - User's email
   */
  const handleManualSignUp = useCallback(async (name: string, email: string) => {
    let currentUser: User | null = null;
    try {
      const existingUsers = await db.getUsers();
      currentUser = existingUsers.find(u => u.email === email) || null;
      
      if (!currentUser) {
        currentUser = {
          id: `u${Date.now()}`,
          name,
          email,
          isAdmin: false,
          waiverAccepted: false
        };
        const response = await fetch('/api/user/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: currentUser })
        });
        if (!response.ok) {
          const err = await response.json();
          console.error('[handleManualSignUp] Registration failed:', err);
          throw new Error(err.error || 'Failed to create account');
        }
        console.log('[handleManualSignUp] User registered successfully');
      }
      
      if (currentUser) {
        setUser(currentUser);
        setAppState('onboarding');
      }
    } catch (err) {
      console.error('Failed to sign up:', err);
      if (currentUser) {
        setUser(currentUser);
        setAppState('onboarding');
      }
    }
  }, []);

  /**
   * Handle sign out - clears user state and signs out from Supabase
   */
  const handleSignOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await signOut();
    }
    setUser(null);
    setAppState('signin');
    setAuthScreen('landing');
  }, []);

  /**
   * Handle onboarding completion - saves waiver data and transitions to client
   * @param waiverData - Signed waiver data
   * @param injuries - User's injury records
   */
  const handleOnboardingComplete = useCallback(async (waiverData: WaiverData, injuries: InjuryRecord[]) => {
    if (!user) return;
    
    try {
      const updatedUser: User = {
        ...user,
        waiverAccepted: true,
        waiverData: waiverData,
        injuries: injuries
      };
      
      await syncUserToServer(updatedUser);
      
      // Send welcome email
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: 'Welcome to The FASCIA Movement Dome! 🧘',
            template: 'welcome',
            data: { name: user.name }
          })
        });
      } catch (emailErr) {
        console.error('[Onboarding] Welcome email failed:', emailErr);
      }
      
      setUser(updatedUser);
      setAppState('client');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
  }, [user]);

  /**
   * Check for OAuth/Magic Link session on mount
   */
  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured()) {
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        
        if (authCode) {
          console.log('[Auth] Magic link code detected, exchanging for session...');
          setAuthChecking(true);
          const result = await exchangeCodeForSession(authCode);
          if (result.success) {
            console.log('[Auth] Successfully exchanged code for session');
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.error('[Auth] Failed to exchange code:', result.error);
          }
          setAuthChecking(false);
        }
        
        const supabaseUser = await getCurrentUser();
        if (supabaseUser) {
          console.log('[Auth] User authenticated:', supabaseUser.email);
          const existingUsers = await db.getUsers();
          let dbUser = existingUsers.find(u => u.email === supabaseUser.email);
          
          if (!dbUser) {
            dbUser = {
              id: supabaseUser.id,
              name: supabaseUser.name,
              email: supabaseUser.email,
              isAdmin: false,
              waiverAccepted: false
            };
            await syncUserToServer(dbUser);
          }
          
          setUser(dbUser);
          
          if (dbUser.isAdmin) {
            setAppState('admin');
          } else {
            const hasSignedWaiver = dbUser.waiverData?.signed || dbUser.waiverAccepted;
            console.log('[Auth] Waiver status:', hasSignedWaiver ? 'signed' : 'not signed');
            setAppState(hasSignedWaiver ? 'client' : 'onboarding');
          }
        } else {
          console.log('[Auth] No active session found');
        }
      }
    };
    
    checkSession();
  }, []);

  /**
   * Listen for auth state changes from Supabase
   */
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const existingUsers = await db.getUsers();
        let dbUser = existingUsers.find(u => u.email === authUser.email);
        
        if (!dbUser) {
          dbUser = {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            isAdmin: false,
            waiverAccepted: false
          };
          await syncUserToServer(dbUser);
        }
        
        setUser(dbUser);
        if (dbUser.isAdmin) {
          setAppState('admin');
        } else {
          const hasSignedWaiver = dbUser.waiverData?.signed || dbUser.waiverAccepted;
          setAppState(hasSignedWaiver ? 'client' : 'onboarding');
        }
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    user,
    appState,
    authScreen,
    authChecking,
    handleSignIn,
    handleManualSignUp,
    handleSignOut,
    handleOnboardingComplete,
    setAppState,
    setAuthScreen
  };
}

export { INACTIVITY_TIMEOUT, syncUserToServer };
