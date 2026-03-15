
import React, { useState } from 'react';
import { PauseLogo } from '../components/PauseLogo';
import { GoogleIcon, PersonIcon, ArrowLeftIcon, AppleIcon, FacebookIcon } from '../components/Icons';
import { motion } from 'framer-motion';
import { signInWithGoogle, signInWithFacebook, signInWithApple, isSupabaseConfigured } from '../lib/supabase';

interface SignInScreenProps {
  onSignIn: () => void;
  onAdminSignIn: () => void;
  onTeacherSignIn: () => void;
  onManualSignUp: (name: string, email: string) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignIn, onAdminSignIn, onTeacherSignIn, onManualSignUp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setIsLoading(true);
    setError(null);
    
    // Check if Supabase is configured for real Google OAuth
    if (isSupabaseConfigured()) {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // If successful, the page will redirect to Google OAuth
      // The onSignIn callback will be called after OAuth returns
    } else {
      // Fallback to mock sign in if Supabase is not configured
      onSignIn();
    }
  };

  const handleAppleClick = async () => {
    setIsLoading(true);
    setError(null);
    
    // Check if Supabase is configured for real Apple OAuth
    if (isSupabaseConfigured()) {
      const result = await signInWithApple();
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // If successful, the page will redirect to Apple OAuth
      // The onSignIn callback will be called after OAuth returns
    } else {
      // Fallback to mock sign in if Supabase is not configured
      onSignIn();
    }
  };

  const handleFacebookClick = async () => {
    setIsLoading(true);
    setError(null);
    
    // Check if Supabase is configured for real Facebook OAuth
    if (isSupabaseConfigured()) {
      const result = await signInWithFacebook();
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // If successful, the page will redirect to Facebook OAuth
      // The onSignIn callback will be called after OAuth returns
    } else {
      // Fallback to mock sign in if Supabase is not configured
      onSignIn();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualName && manualEmail) {
        setIsLoading(true);
        onManualSignUp(manualName, manualEmail);
    }
  };

  return (
    <div className="min-h-screen bg-[#6E7568] flex flex-col items-center justify-center p-6">
      {/* 
         Centered Pulsing Animation framing the Logo 
         Moved PulsingCircle from corner to center and scaled up slightly
      */}
      
      <div className="w-full max-w-lg flex flex-col items-center justify-center">
        
        {/* Logo Section */}
        <div className="mb-12 text-center relative z-30">
          <PauseLogo size="hero" />
        </div>

        {/* Auth Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[360px] flex flex-col gap-8 items-center"
        >
          {!showManual ? (
              <>
                {/* Error Display */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center"
                  >
                    <p className="text-red-200 text-xs">{error}</p>
                  </motion.div>
                )}
                
                {/* Premium Google Button */}
                <button
                    onClick={handleGoogleClick}
                    disabled={isLoading}
                    className="
                    group relative w-full flex items-center justify-center gap-4 
                    bg-gradient-to-b from-[#FBF7EF] to-[#E8E0D0] 
                    text-[#26150B] rounded-full py-4 px-6 
                    font-bold text-xs uppercase tracking-[0.2em] 
                    shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1)]
                    border border-[#FBF7EF]/60
                    transition-all duration-300 ease-out
                    hover:shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.15)]
                    cursor-pointer disabled:opacity-80 disabled:cursor-wait disabled:transform-none
                    "
                >
                    {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#26150B]/30 border-t-[#26150B] rounded-full animate-spin" />
                    ) : (
                    <>
                        <div className="bg-white rounded-full p-1.5 shadow-sm group-hover:scale-105 transition-transform duration-300 border border-[#26150B]/5">
                            <GoogleIcon size={16} />
                        </div>
                        <span className="relative z-10 pt-0.5 text-[#26150B]/90">Sign in with Google</span>
                    </>
                    )}
                </button>

                {/* Apple Button */}
                <button
                    onClick={handleAppleClick}
                    disabled={isLoading}
                    className="
                    group relative w-full flex items-center justify-center gap-4 
                    bg-[#26150B] 
                    text-[#FBF7EF] rounded-full py-4 px-6 
                    font-bold text-xs uppercase tracking-[0.2em] 
                    shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.3)]
                    border border-[#FBF7EF]/10
                    transition-all duration-300 ease-out
                    hover:shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.4)]
                    cursor-pointer disabled:opacity-80 disabled:cursor-wait disabled:transform-none
                    "
                >
                    {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#FBF7EF]/30 border-t-[#FBF7EF] rounded-full animate-spin" />
                    ) : (
                    <>
                        <AppleIcon size={18} />
                        <span className="relative z-10 pt-0.5">Sign in with Apple</span>
                    </>
                    )}
                </button>

                {/* Facebook Button */}
                <button
                    onClick={handleFacebookClick}
                    disabled={isLoading}
                    className="
                    group relative w-full flex items-center justify-center gap-4 
                    bg-[#1877F2] 
                    text-white rounded-full py-4 px-6 
                    font-bold text-xs uppercase tracking-[0.2em] 
                    shadow-[0_4px_12px_rgba(24,119,242,0.3),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2)]
                    border border-white/10
                    transition-all duration-300 ease-out
                    hover:shadow-[0_8px_24px_rgba(24,119,242,0.4),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:bg-[#166FE5]
                    active:translate-y-0 active:shadow-[0_2px_8px_rgba(24,119,242,0.2),inset_0_2px_4px_rgba(0,0,0,0.3)]
                    cursor-pointer disabled:opacity-80 disabled:cursor-wait disabled:transform-none
                    "
                >
                    {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                    <>
                        <FacebookIcon size={18} />
                        <span className="relative z-10 pt-0.5">Sign in with Facebook</span>
                    </>
                    )}
                </button>

                <button 
                    onClick={() => setShowManual(true)}
                    className="text-[#FBF7EF] text-[10px] uppercase tracking-[0.15em] font-bold hover:text-white transition-all cursor-pointer opacity-70 hover:opacity-100 flex items-center gap-2 group"
                >
                    <span>Or Register Manually</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </>
          ) : (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleManualSubmit} 
                className="w-full space-y-5 bg-[#FBF7EF]/10 backdrop-blur-xl p-8 rounded-[2rem] border border-[#FBF7EF]/20 shadow-2xl relative overflow-hidden"
              >
                  {/* Glass Reflection */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

                  <div className="flex items-center justify-between mb-2 relative z-10">
                      <button 
                        type="button"
                        onClick={() => setShowManual(false)}
                        className="w-8 h-8 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center text-[#FBF7EF] hover:bg-[#FBF7EF]/20 transition-colors"
                      >
                          <ArrowLeftIcon size={16} />
                      </button>
                      <h3 className="text-[#FBF7EF] text-xs font-bold uppercase tracking-widest">Create Account</h3>
                      <div className="w-8" /> {/* Spacer for balance */}
                  </div>

                  <div className="space-y-4 relative z-10">
                      <div className="group">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Full Name</label>
                          <div className="relative">
                              <input 
                                type="text" 
                                value={manualName}
                                onChange={e => setManualName(e.target.value)}
                                className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner"
                                placeholder="Jane Doe"
                                required
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40">
                                  <PersonIcon size={16} />
                              </div>
                          </div>
                      </div>
                      
                      <div className="group">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Email Address</label>
                          <div className="relative">
                              <input 
                                type="email" 
                                value={manualEmail}
                                onChange={e => setManualEmail(e.target.value)}
                                className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner"
                                placeholder="jane@example.com"
                                required
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                      <polyline points="22,6 12,13 2,6"></polyline>
                                  </svg>
                              </div>
                          </div>
                      </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-[#FBF7EF] text-[#26150B] rounded-full py-4 text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#EDE8DC] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)] active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                  >
                      {isLoading ? "Creating..." : "Join The Dome"}
                  </button>
              </motion.form>
          )}

          <button
            onClick={onAdminSignIn}
            className="text-[#FBF7EF]/20 text-[9px] uppercase tracking-[0.2em] font-bold hover:text-[#FBF7EF]/60 transition-all duration-300 border-b border-transparent hover:border-[#FBF7EF]/30 pb-1 cursor-pointer"
          >
            Admin Portal
          </button>

          <button
            onClick={onTeacherSignIn}
            className="text-[#FBF7EF]/20 text-[9px] uppercase tracking-[0.2em] font-bold hover:text-[#FBF7EF]/60 transition-all duration-300 border-b border-transparent hover:border-[#FBF7EF]/30 pb-1 cursor-pointer"
          >
            Teacher Portal
          </button>
          
          <p className="text-center text-[#FBF7EF]/30 text-[9px] leading-relaxed max-w-[240px] mx-auto font-medium">
            By entering the Dome, you agree to our Terms.<br/>
            We respect your inbox and your privacy.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
