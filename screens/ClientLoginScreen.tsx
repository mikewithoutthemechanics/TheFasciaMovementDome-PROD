import React, { useState } from 'react';
import { PauseLogo } from '../components/PauseLogo';
import { GoogleIcon, PersonIcon, ArrowLeftIcon, AppleIcon, FacebookIcon, MailIcon, AwardIcon } from '../components/Icons';
import { motion } from 'framer-motion';
import { signInWithGoogle, signInWithFacebook, signInWithApple, isSupabaseConfigured, supabase } from '../lib/supabase';

const TEACHER_SPECIALIZATIONS = [
  'Strength Training', 'Cardio', 'HIIT', 'Yoga', 'Pilates',
  'Boxing/MMA', 'CrossFit', 'Nutrition', 'Rehabilitation', 'Sports Specific',
  'Pre/Postnatal', 'Senior Fitness'
];

interface ClientLoginScreenProps {
  onBack: () => void;
  onSignIn: () => void;
  onManualSignUp: (name: string, email: string) => void;
}

export const ClientLoginScreen: React.FC<ClientLoginScreenProps> = ({ onBack, onSignIn, onManualSignUp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showTeacherRegister, setShowTeacherRegister] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '', email: '', phone: '', qualifications: '', experience: '', specializations: [] as string[]
  });
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const [teacherSuccess, setTeacherSuccess] = useState(false);

  const handleGoogleClick = async () => {
    setIsLoading(true);
    setError(null);
    if (isSupabaseConfigured()) {
      const result = await signInWithGoogle();
      if (result.error) { setError(result.error); setIsLoading(false); }
    } else { onSignIn(); }
  };

  const handleAppleClick = async () => {
    setIsLoading(true);
    setError(null);
    if (isSupabaseConfigured()) {
      const result = await signInWithApple();
      if (result.error) { setError(result.error); setIsLoading(false); }
    } else { onSignIn(); }
  };

  const handleFacebookClick = async () => {
    setIsLoading(true);
    setError(null);
    if (isSupabaseConfigured()) {
      const result = await signInWithFacebook();
      if (result.error) { setError(result.error); setIsLoading(false); }
    } else { onSignIn(); }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualName && manualEmail) {
      setIsLoading(true);
      onManualSignUp(manualName, manualEmail);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setTeacherForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.email) {
      setError("Name and email are required");
      return;
    }
    setTeacherSubmitting(true);
    setError(null);
    if (!supabase) { setError("Supabase not configured"); setTeacherSubmitting(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: teacherForm.email,
          password: Math.random().toString(36).slice(-12),
          options: { data: { full_name: teacherForm.name, phone: teacherForm.phone || undefined } }
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Failed to create account");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();
        if (!refreshedUser) throw new Error("Failed to get user session");
        const response = await fetch("/api/teacher/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: refreshedUser.id, name: teacherForm.name, email: teacherForm.email,
            phone: teacherForm.phone || null, qualifications: teacherForm.qualifications || null,
            experience: teacherForm.experience || null, specializations: teacherForm.specializations
          })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Failed to submit request"); }
        setTeacherSuccess(true);
      }
    } catch (err: any) { setError(err.message || "Failed to submit teacher request"); }
    finally { setTeacherSubmitting(false); }
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
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }} className="w-full max-w-[360px] flex flex-col gap-6 items-center">
          {!showManual && !showTeacherRegister ? (
            <>
              {error && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center"><p className="text-red-200 text-xs">{error}</p></motion.div>)}
              <button onClick={handleGoogleClick} disabled={isLoading} className="group relative w-full flex items-center justify-center gap-4 bg-gradient-to-b from-[#FBF7EF] to-[#E8E0D0] text-[#26150B] rounded-full py-4 px-6 font-bold text-xs uppercase tracking-[0.2em] shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1)] border border-[#FBF7EF]/60 transition-all duration-300 ease-out hover:shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.15)] cursor-pointer disabled:opacity-80 disabled:cursor-wait disabled:transform-none">
                {isLoading ? (<div className="w-5 h-5 border-2 border-[#26150B]/30 border-t-[#26150B] rounded-full animate-spin" />) : (<><div className="bg-white rounded-full p-1.5 shadow-sm group-hover:scale-105 transition-transform duration-300 border border-[#26150B]/5"><GoogleIcon size={16} /></div><span className="relative z-10 pt-0.5 text-[#26150B]/90">Sign in with Google</span></>)}
              </button>
              <button onClick={handleAppleClick} disabled={isLoading} className="group relative w-full flex items-center justify-center gap-4 bg-[#26150B] text-[#FBF7EF] rounded-full py-4 px-6 font-bold text-xs uppercase tracking-[0.2em] shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.3)] border border-[#FBF7EF]/10 transition-all duration-300 ease-out hover:shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.4)] cursor-pointer disabled:opacity-80 disabled:cursor-wait disabled:transform-none">
                {isLoading ? (<div className="w-5 h-5 border-2 border-[#FBF7EF]/30 border-t-[#FBF7EF] rounded-full animate-spin" />) : (<><AppleIcon size={18} /><span className="relative z-10 pt-0.5">Sign in with Apple</span></>)}
              </button>
              <button onClick={handleFacebookClick} disabled={isLoading} className="group relative w-full flex items-center justify-center gap-4 bg-[#1877F2] text-white rounded-full py-4 px-6 font-bold text-xs uppercase tracking-[0.2em] shadow-[0_4px_12px_rgba(24,119,242,0.3),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-white/10 transition-all duration-300 ease-out hover:shadow-[0_8px_24px_rgba(24,119,242,0.4),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:bg-[#166FE5] active:translate-y-0 active:shadow-[0_2px_8px_rgba(24,119,242,0.2),inset_0_2px_4px_rgba(0,0,0,0.3)] cursor-pointer disabled:opacity-80 disabled:cursor-wait disabled:transform-none">
                {isLoading ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<><FacebookIcon size={18} /><span className="relative z-10 pt-0.5">Sign in with Facebook</span></>)}
              </button>
              <button onClick={() => setShowManual(true)} className="text-[#FBF7EF] text-[10px] uppercase tracking-[0.15em] font-bold hover:text-white transition-all cursor-pointer opacity-70 hover:opacity-100 flex items-center gap-2 group">
                <span>Or Register Manually</span><span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button onClick={() => { setShowTeacherRegister(true); setError(null); }} className="text-[#FBF7EF] text-[10px] uppercase tracking-[0.15em] font-bold hover:text-white transition-all cursor-pointer opacity-70 hover:opacity-100 flex items-center gap-2 group">
                <AwardIcon size={14} /><span>Become a Teacher</span><span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </>
          ) : showManual ? (
            <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleManualSubmit} className="w-full space-y-5 bg-[#FBF7EF]/10 backdrop-blur-xl p-8 rounded-[2rem] border border-[#FBF7EF]/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <button type="button" onClick={() => setShowManual(false)} className="w-8 h-8 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center text-[#FBF7EF] hover:bg-[#FBF7EF]/20 transition-colors"><ArrowLeftIcon size={16} /></button>
                <h3 className="text-[#FBF7EF] text-xs font-bold uppercase tracking-widest">Create Account</h3>
                <div className="w-8" />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="group">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Full Name</label>
                  <div className="relative">
                    <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner" placeholder="Jane Doe" required />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40"><PersonIcon size={16} /></div>
                  </div>
                </div>
                <div className="group">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Email Address</label>
                  <div className="relative">
                    <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner" placeholder="jane@example.com" required />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40"><MailIcon size={16} /></div>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full mt-2 bg-[#FBF7EF] text-[#26150B] rounded-full py-4 text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#EDE8DC] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)] active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed relative z-10">
                {isLoading ? "Creating..." : "Join The Dome"}
              </button>
            </motion.form>
          ) : (
            <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleTeacherSubmit} className="w-full space-y-5 bg-[#FBF7EF]/10 backdrop-blur-xl p-8 rounded-[2rem] border border-[#FBF7EF]/20 shadow-2xl relative overflow-hidden max-h-[80vh] overflow-y-auto">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <button type="button" onClick={() => { setShowTeacherRegister(false); setError(null); setTeacherSuccess(false); }} className="w-8 h-8 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center text-[#FBF7EF] hover:bg-[#FBF7EF]/20 transition-colors"><ArrowLeftIcon size={16} /></button>
                <h3 className="text-[#FBF7EF] text-xs font-bold uppercase tracking-widest">Teacher Application</h3>
                <div className="w-8" />
              </div>
              {teacherSuccess ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><AwardIcon size={32} className="text-green-400" /></div>
                  <h4 className="text-[#FBF7EF] font-bold text-lg mb-2">Application Submitted!</h4>
                  <p className="text-[#FBF7EF]/60 text-sm mb-6">Your teacher application has been submitted for review.</p>
                  <button type="button" onClick={() => { setShowTeacherRegister(false); setTeacherSuccess(false); setTeacherForm({ name: '', email: '', phone: '', qualifications: '', experience: '', specializations: [] }); }} className="text-[#FBF7EF] text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">Back to Sign In</button>
                </motion.div>
              ) : (
                <div className="space-y-4 relative z-10">
                  <p className="text-[#FBF7EF]/50 text-[10px] text-center mb-4">Apply to become a certified teacher. Admin approval required.</p>
                  <div className="group">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Full Name *</label>
                    <div className="relative"><input type="text" value={teacherForm.name} onChange={e => setTeacherForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner" placeholder="Jane Doe" required /><div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40"><PersonIcon size={16} /></div></div>
                  </div>
                  <div className="group">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-1.5 ml-3">Email Address *</label>
                    <div className="relative"><input type="email" value={teacherForm.email} onChange={e => setTeacherForm(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-[#26150B]/30 border border-[#FBF7EF]/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-[#FBF7EF] placeholder-[#FBF7EF]/20 outline-none focus:border-[#FBF7EF]/40 focus:bg-[#26150B]/50 transition-all shadow-inner" placeholder="jane@example.com" required /><div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBF7EF]/40"><MailIcon size={16} /></div></div>
                  </div>
                  <div className="group">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/60 mb-2 ml-3">Specializations</label>
                    <div className="flex flex-wrap gap-2">
                      {TEACHER_SPECIALIZATIONS.map(spec => (<button key={spec} type="button" onClick={() => toggleSpecialization(spec)} className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${teacherForm.specializations.includes(spec) ? 'bg-[#FBF7EF] text-[#26150B]' : 'bg-[#26150B]/30 text-[#FBF7EF]/60 border border-[#FBF7EF]/10 hover:border-[#FBF7EF]/30'}`}>{spec}</button>))}
                    </div>
                  </div>
                  {error && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center"><p className="text-red-200 text-xs">{error}</p></motion.div>)}
                  <button type="submit" disabled={teacherSubmitting} className="w-full mt-4 bg-[#FBF7EF] text-[#26150B] rounded-full py-4 text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#EDE8DC] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)] active:shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed relative z-10">{teacherSubmitting ? "Submitting..." : "Submit Application"}</button>
                </div>
              )}
            </motion.form>
          )}
          <p className="text-center text-[#FBF7EF]/30 text-[9px] leading-relaxed max-w-[240px] mx-auto font-medium pt-4">By entering the Dome, you agree to our Terms.</p>
        </motion.div>
      </div>
    </div>
  );
};
