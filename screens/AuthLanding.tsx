
import React, { useState } from 'react';
import { MailIcon, CheckCircleIcon } from '../components/Icons';
import { motion } from 'framer-motion';
import { signInWithMagicLink, signInWithGoogle, signInWithApple, isSupabaseConfigured } from '../lib/supabase';

interface AuthLandingProps {
  onClientLogin: () => void;
  onBack?: () => void;
  onAdminClick?: () => void;
}

// Floating particles like landing page
const FloatingParticle = ({ delay, left, top, color }: { delay: number; left: string; top: string; color: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.6, 0], y: [0, -60, -120], x: [0, Math.random() * 20 - 10, 0] }}
    transition={{ duration: 5, repeat: Infinity, delay, ease: "easeOut" }}
    style={{ position: 'absolute', left, top, width: 4, height: 4, borderRadius: '50%', backgroundColor: color }}
    className="pointer-events-none"
  />
);

const FloatingOrb = ({ delay, className }: { delay: number; className: string }) => (
  <motion.div
    animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 10, repeat: Infinity, delay, ease: "easeInOut" }}
    className={className}
  />
);

export const AuthLanding: React.FC<AuthLandingProps> = ({ onClientLogin, onBack: _onBack, onAdminClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  
  // Error modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  
  // Magic Link states
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleError = (title: string, message: string) => {
    setErrorTitle(title);
    setError(message);
    setShowErrorModal(true);
    setIsLoading(false);
    setOauthProvider(null);
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail) return;
    
    setIsLoading(true);
    setError(null);
    
    if (isSupabaseConfigured()) {
      const result = await signInWithMagicLink(magicLinkEmail);
      if (result.success) {
        setMagicLinkSent(true);
      } else {
        handleError('Magic Link Failed', result.error || 'Failed to send magic link. Please try again.');
      }
      setIsLoading(false);
    } else { 
      handleError('Configuration Error', 'Supabase is not configured. Please contact support.');
    }
  };

  const handleGoogleClick = async () => {
    setOauthProvider('google');
    setIsLoading(true);
    setError(null);
    if (isSupabaseConfigured()) {
      const result = await signInWithGoogle();
      if (result.error) { 
        handleError('Google Sign-In Failed', result.error);
      }
    } else { 
      handleError('Configuration Error', 'Supabase is not configured. Please contact support.');
    }
  };

  const handleAppleClick = async () => {
    setOauthProvider('apple');
    setIsLoading(true);
    setError(null);
    if (isSupabaseConfigured()) {
      const result = await signInWithApple();
      if (result.error) { 
        handleError('Apple Sign-In Failed', result.error);
      }
    } else { 
      handleError('Configuration Error', 'Supabase is not configured. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-[#6E7568] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* FLOATING PARTICLES */}
      <FloatingParticle delay={0} left="10%" top="90%" color="#FBF7EF" />
      <FloatingParticle delay={0.7} left="20%" top="85%" color="#C05640" />
      <FloatingParticle delay={1.4} left="30%" top="95%" color="#FBF7EF" />
      <FloatingParticle delay={2.1} left="50%" top="88%" color="#C05640" />
      <FloatingParticle delay={2.8} left="70%" top="92%" color="#FBF7EF" />
      <FloatingParticle delay={3.5} left="85%" top="86%" color="#C05640" />

      {/* FLOATING ORBS */}
      <FloatingOrb delay={0} className="fixed top-[5%] right-[-10%] w-[300px] h-[300px] bg-gradient-to-br from-[#FBF7EF]/20 to-transparent rounded-full blur-[80px] pointer-events-none" />
      <FloatingOrb delay={3} className="fixed bottom-[10%] left-[-15%] w-[400px] h-[400px] bg-gradient-to-tr from-[#C05640]/15 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Error Modal */}
      {showErrorModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowErrorModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-[#26150B] rounded-2xl p-6 shadow-2xl border border-[#FBF7EF]/20"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-[#FBF7EF] font-bold text-lg mb-2">{errorTitle || 'Authentication Error'}</h3>
              <p className="text-[#FBF7EF]/70 text-sm mb-6">{error}</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowErrorModal(false);
                    setError(null);
                  }}
                  className="w-full py-3 px-4 bg-[#FBF7EF] text-[#26150B] rounded-full font-bold text-sm uppercase tracking-wide hover:bg-white transition-colors"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-3 px-4 bg-transparent border border-[#FBF7EF]/30 text-[#FBF7EF] rounded-full font-bold text-sm uppercase tracking-wide hover:bg-[#FBF7EF]/10 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="w-full max-w-lg flex flex-col items-center justify-center relative z-10">
        
        {/* Logo Section - Big & Enhanced */}
        <div className="mb-10 sm:mb-12 text-center relative z-30">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative inline-block"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FBF7EF]/40 via-[#C05640]/20 to-[#6E7568]/30 blur-3xl scale-125 rounded-full"></div>
            {/* Secondary glow */}
            <div className="absolute -inset-8 bg-[#FBF7EF]/10 rounded-full blur-3xl"></div>
            <img src="/logo-transparent.png" alt="The Fascia Movement" className="relative z-10 w-48 h-auto max-w-full" />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-[#FBF7EF]/80 text-xs sm:text-sm font-medium text-center tracking-wide"
        >
          Welcome to The FASCIA Movement Dome
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[320px] sm:max-w-[360px] flex flex-col gap-6 sm:gap-8 items-center"
        >
          {error && !showErrorModal && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center"
            >
              <p className="text-red-200 text-xs">{error}</p>
            </motion.div>
          )}
          
          {!magicLinkSent ? (
            <>
              {/* MAGIC LINK - BIG PROMINENT BUTTON */}
              <form onSubmit={handleMagicLinkSubmit} className="w-full space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-[#FBF7EF]/10 border border-[#FBF7EF]/30 rounded-2xl py-4 px-5 text-[#FBF7EF] placeholder-[#FBF7EF]/50 focus:outline-none focus:border-[#FBF7EF]/60 focus:bg-[#FBF7EF]/15 transition-all text-sm"
                    required
                  />
                  <MailIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FBF7EF]/50" />
                </div>
                <motion.button 
                  type="submit"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading || !magicLinkEmail}
                  className="w-full relative overflow-hidden rounded-[1.5rem] py-5 px-6 shadow-2xl cursor-pointer group"
                  style={{ minHeight: '64px' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FBF7EF] via-[#fff] to-[#FBF7EF]"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <div className="absolute inset-0 rounded-[1.5rem] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]"></div>
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-[#6E7568]/30 border-t-[#6E7568] rounded-full animate-spin" />
                    ) : (
                      <span className="text-[#26150B] font-bold text-base tracking-[0.1em] uppercase drop-shadow-md">
                        Get Your Free Pass
                      </span>
                    )}
                  </div>
                </motion.button>
              </form>

              <div className="w-full flex items-center gap-3">
                <div className="h-px flex-1 bg-[#FBF7EF]/20"></div>
                <span className="text-[#FBF7EF]/50 text-[9px] uppercase tracking-widest">quick sign in</span>
                <div className="h-px flex-1 bg-[#FBF7EF]/20"></div>
              </div>

              {/* OAuth Circle Buttons */}
              <div className="flex items-center justify-center gap-6">
                {/* Google Circle */}
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGoogleClick}
                  disabled={isLoading}
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                >
                  {oauthProvider === 'google' && isLoading ? (
                    <div className="w-6 h-6 border-2 border-[#26150B]/30 border-t-[#26150B] rounded-full animate-spin" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                </motion.button>

                {/* Apple Circle */}
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAppleClick}
                  disabled={isLoading}
                  className="w-16 h-16 rounded-full bg-[#26150B] flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                >
                  {oauthProvider === 'apple' && isLoading ? (
                    <div className="w-6 h-6 border-2 border-[#FBF7EF]/30 border-t-[#FBF7EF] rounded-full animate-spin" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#FBF7EF">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  )}
                </motion.button>
              </div>

              {/* TEMP ADMIN BUTTON - REMOVE AFTER TESTING */}
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onAdminClick}
                className="mt-6 text-[10px] text-[#FBF7EF]/40 underline hover:text-[#FBF7EF]/60 uppercase tracking-widest"
              >
                Admin Login (Temp)
              </motion.button>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="w-full text-center space-y-6 py-4"
            >
              <div className="w-16 h-16 bg-[#C05640] rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon size={32} className="text-[#FBF7EF]" />
              </div>
              <div>
                <h3 className="text-[#FBF7EF] text-base font-bold mb-1">Check Your Email!</h3>
                <p className="text-[#FBF7EF]/70 text-xs">We sent a magic link to</p>
                <p className="text-[#FBF7EF] font-medium text-sm mt-1">{magicLinkEmail}</p>
              </div>
              <p className="text-[#FBF7EF]/50 text-[10px]">Click the link to sign in and complete your waiver</p>
              <button 
                onClick={() => { setMagicLinkSent(false); setMagicLinkEmail(""); }} 
                className="text-[#FBF7EF]/60 text-xs hover:text-[#FBF7EF] transition-colors underline"
              >
                Use a different email
              </button>
            </motion.div>
          )}
          
          <p className="text-center text-[#FBF7EF]/30 text-[9px] leading-relaxed max-w-[240px] mx-auto font-medium pt-2">
            No credit card required. Start your journey today.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
