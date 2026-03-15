import React, { useState } from 'react';
import { PauseLogo } from '../components/PauseLogo';
import { ArrowLeftIcon, MailIcon, ShieldIcon } from '../components/Icons';
import { motion } from 'framer-motion';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AdminLoginScreenProps {
  onBack: () => void;
  onSignIn: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onBack, onSignIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        if (data.user) {
          const response = await fetch("/api/admin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user.id })
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Admin verification failed");
          }

          const adminData = await response.json();
          
          if (!adminData.isAdmin) {
            await supabase.auth.signOut();
            throw new Error("You do not have admin access");
          }

          onSignIn();
        }
      } else {
        onSignIn();
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#6E7568] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg flex flex-col items-center justify-center">
        <div className="mb-10 text-center relative z-30">
          <button onClick={onBack} className="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center text-[#FBF7EF] hover:bg-[#FBF7EF]/20 transition-colors">
            <ArrowLeftIcon size={20} />
          </button>
          <PauseLogo size="hero" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[360px] flex flex-col gap-6 items-center"
        >
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FBF7EF] rounded-full mb-3">
              <ShieldIcon size={24} className="text-[#26150B]" />
            </div>
            <h1 className="text-[#FBF7EF] text-xl font-bold">Admin Portal</h1>
            <p className="text-[#FBF7EF]/50 text-xs mt-1">Staff access only</p>
          </div>

          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleSubmit} 
            className="w-full space-y-5 bg-[#FBF7EF]/10 backdrop-blur-xl p-8 rounded-[2rem] border border-[#FBF7EF]/20 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center"
              >
                <p className="text-red-200 text-xs">{error}</p>
              </motion.div>
            )}

            <div className="space-y-4 relative z-10">
              <div className="group">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner"
                    placeholder="admin@pausefmd.co.za"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40">
                    <MailIcon size={16} />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Password</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner"
                    placeholder="••••••••"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40">
                    <ShieldIcon size={16} />
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#FBF7EF] text-[#26150B] rounded-full py-4 text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#EDE8DC] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)] active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-center text-[#FBF7EF]/30 text-[9px]">
              Authorized personnel only
            </p>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
};
