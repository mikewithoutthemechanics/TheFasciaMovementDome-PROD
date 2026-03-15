import { useEffect, useRef, useCallback } from 'react';
import { INACTIVITY_TIMEOUT } from './useAuth';

/**
 * Interface for the useInactivity hook options
 */
export interface UseInactivityOptions {
  /** Timeout in milliseconds (defaults to INACTIVITY_TIMEOUT from useAuth) */
  timeout?: number;
  /** Callback function to execute on inactivity timeout */
  onTimeout: () => void;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
}

/**
 * Interface for the useInactivity hook return value
 */
export interface UseInactivityReturn {
  /** Reference to the inactivity timer */
  inactivityTimer: React.MutableRefObject<NodeJS.Timeout | null>;
  /** Function to manually reset the inactivity timer */
  resetInactivityTimer: () => void;
}

/**
 * Custom hook for managing user inactivity timeout
 * 
 * Automatically logs out the user after a period of inactivity.
 * Monitors mouse, keyboard, scroll, and touch events to reset the timer.
 * 
 * @param options - Configuration options for the inactivity hook
 * @returns Object containing the timer ref and reset function
 */
export function useInactivity(options: UseInactivityOptions): UseInactivityReturn {
  const { onTimeout, isAuthenticated, timeout = INACTIVITY_TIMEOUT } = options;
  
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Resets the inactivity timer
   * Clears the existing timer and starts a new one if the user is authenticated
   */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    
    if (isAuthenticated) {
      inactivityTimer.current = setTimeout(() => {
        console.log('[Inactivity] Auto-logging out due to inactivity');
        onTimeout();
      }, timeout);
    }
  }, [isAuthenticated, onTimeout, timeout]);

  /**
   * Set up inactivity monitoring on mount and when user state changes
   */
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timer when user logs out
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      return;
    }

    // Reset timer on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });
    
    // Start the timer
    resetInactivityTimer();
    
    // Cleanup on unmount or when user logs out
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [isAuthenticated, resetInactivityTimer]);

  return {
    inactivityTimer,
    resetInactivityTimer
  };
}

export { INACTIVITY_TIMEOUT };
