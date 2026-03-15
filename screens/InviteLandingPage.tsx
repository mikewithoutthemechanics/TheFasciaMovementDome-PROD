
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Class, AppSettings, Venue } from '../types';
import { getVenue, formatDate, formatTime, spotsLeft, isFull } from '../utils';
import { PauseLogo } from '../components/PauseLogo';
import { MapPinIcon, ClockIcon, CalendarIcon, CheckIcon, StarIcon } from '../components/Icons';
import { db } from '../services/db-supabase';

interface InviteLandingPageProps {
  classes?: Class[];
  cls?: Class;
  venues: Venue[];
  referrerName?: string;
  onRegister: () => void;
  forceRefreshSettings?: boolean;
}

const Sparkle = ({ delay, left, top, size }: { delay: number; left: string; top: string; size: number }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: [0, 1.2, 0], 
      opacity: [0, 1, 0],
      rotate: [0, 180, 360]
    }}
    transition={{ 
      duration: 2, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut"
    }}
    style={{ position: 'absolute', left, top, width: size, height: size }}
    className="pointer-events-none"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-[#C05640] w-full h-full">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </motion.div>
);

const FloatingOrb = ({ delay, className }: { delay: number; className: string }) => (
  <motion.div
    animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: 8, repeat: Infinity, delay, ease: "easeInOut" }}
    className={className}
  />
);

const FloatingParticle = ({ delay, left, top, color }: { delay: number; left: string; top: string; color: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.8, 0], y: [0, -40, -80], x: [0, Math.random() * 20 - 10, 0] }}
    transition={{ duration: 4, repeat: Infinity, delay, ease: "easeOut" }}
    style={{ position: 'absolute', left, top, width: 4, height: 4, borderRadius: '50%', backgroundColor: color }}
  />
);

const SkeletonLoader = () => (
  <div className="min-h-screen bg-[#FBF7EF] animate-pulse flex items-center justify-center">
    <div className="w-16 h-16 bg-[#6E7568]/20 rounded-full"></div>
  </div>
);

export const InviteLandingPage: React.FC<InviteLandingPageProps> = ({ classes, cls: singleCls, venues, referrerName, onRegister, forceRefreshSettings = false }) => {
  const upcomingClasses = classes
    ? classes.filter(c => c.status === "published" && new Date(c.dateTime) > new Date())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    : [];
  
  const selectedClass = singleCls || upcomingClasses[0] || null;
  const cls = selectedClass;
  
  const venue = cls ? getVenue(cls.venueId, venues) : null;
  const full = cls ? isFull(cls) : false;
  const spots = cls ? spotsLeft(cls) : 0;
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showWaitlistConfirm, setShowWaitlistConfirm] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settingsData = await db.getSettings(forceRefreshSettings);
      setSettings(settingsData);
    };
    loadSettings();
  }, [forceRefreshSettings]);

  if (!settings) return <SkeletonLoader />;
  if (!cls) return <SkeletonLoader />;

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#26150B] relative overflow-hidden font-['Montserrat']">
      
      {/* FLOATING PARTICLES */}
      <FloatingParticle delay={0} left="10%" top="90%" color="#6E7568" />
      <FloatingParticle delay={0.5} left="20%" top="85%" color="#C05640" />
      <FloatingParticle delay={1} left="30%" top="95%" color="#6E7568" />
      <FloatingParticle delay={1.5} left="40%" top="88%" color="#C05640" />
      <FloatingParticle delay={2} left="50%" top="92%" color="#6E7568" />
      <FloatingParticle delay={2.5} left="60%" top="86%" color="#C05640" />
      <FloatingParticle delay={3} left="70%" top="94%" color="#6E7568" />
      <FloatingParticle delay={3.5} left="80%" top="89%" color="#C05640" />
      <FloatingParticle delay={4} left="90%" top="91%" color="#6E7568" />

      {/* FLOATING ORBS */}
      <FloatingOrb delay={0} className="fixed top-[5%] right-[-20%] w-[400px] h-[400px] bg-gradient-to-br from-[#6E7568]/30 to-transparent rounded-full blur-[80px] pointer-events-none" />
      <FloatingOrb delay={2} className="fixed top-[40%] left-[-15%] w-[300px] h-[300px] bg-gradient-to-tr from-[#C05640]/20 to-transparent rounded-full blur-[60px] pointer-events-none" />
      <FloatingOrb delay={4} className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-gradient-to-tl from-[#6E7568]/15 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* SPARKLES */}
      <Sparkle delay={0} left="5%" top="15%" size={16} />
      <Sparkle delay={0.8} left="85%" top="10%" size={20} />
      <Sparkle delay={1.6} left="75%" top="25%" size={14} />
      <Sparkle delay={2.4} left="15%" top="30%" size={18} />
      <Sparkle delay={3.2} left="90%" top="40%" size={12} />

      {/* NOISE OVERLAY */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none z-0" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        
        {/* HERO */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pt-12 pb-8 px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative inline-block mb-8"
          >
            <div className="absolute inset-0 bg-[#6E7568]/30 blur-2xl scale-150 rounded-full"></div>
            <PauseLogo size="lg" />
          </motion.div>

          {referrerName && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 mb-6 bg-white/80 backdrop-blur-md border border-[#6E7568]/20 rounded-full py-2 px-5 shadow-lg"
            >
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-[#C05640]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6E7568]">Invited by {referrerName.split(' ')[0]}</p>
            </motion.div>
          )}

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl font-extrabold leading-[0.9] tracking-tight mb-4 text-[#26150B]"
          >
            {cls.title}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-base text-[#26150B]/60 italic font-medium"
          >
            "{settings.landingPage.headerText}"
          </motion.p>
        </motion.div>

        {/* CONTENT */}
        <div className="px-5 pb-48 flex-1">
          
          {/* CLASS CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="relative mb-8"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6E7568]/40 via-[#C05640]/20 to-[#6E7568]/40 rounded-[2.5rem] blur-lg"></div>
            
            <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] p-1 shadow-2xl">
              <div className="bg-gradient-to-br from-[#FBF7EF] to-white rounded-[1.8rem] p-7">
                
                <div className="flex justify-between items-start mb-6 pb-6 border-b border-[#26150B]/5">
                  <div>
                    <div className="flex gap-2 mb-3">
                      {cls.sportTags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6E7568]/15 to-[#6E7568]/5 text-[#6E7568] text-[9px] font-bold uppercase tracking-wider border border-[#6E7568]/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold text-[#26150B]">Session Details</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#6E7568]/50 mb-1">Entry</p>
                    <p className="text-3xl font-extrabold text-[#26150B]">{cls.price === 0 ? "Free" : `R${cls.price}`}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <motion.div whileHover={{ x: 6 }} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6E7568]/15 to-[#6E7568]/5 flex items-center justify-center text-[#6E7568]">
                      <CalendarIcon size={22} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#6E7568]/50">Date</p>
                      <p className="text-base font-bold text-[#26150B]">{formatDate(cls.dateTime)}</p>
                    </div>
                  </motion.div>
                  
                  <motion.div whileHover={{ x: 6 }} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6E7568]/15 to-[#6E7568]/5 flex items-center justify-center text-[#6E7568]">
                      <ClockIcon size={22} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#6E7568]/50">Time</p>
                      <p className="text-base font-bold text-[#26150B]">{formatTime(cls.dateTime)} <span className="text-[#6E7568]/50 font-medium">({cls.duration} min)</span></p>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ x: 6 }} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6E7568]/15 to-[#6E7568]/5 flex items-center justify-center text-[#6E7568]">
                      <MapPinIcon size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#6E7568]/50">Location</p>
                      <p className="text-base font-bold text-[#26150B]">{venue?.name}</p>
                      {venue?.mapsUrl && (
                        <a href={venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#C05640] hover:underline">View Map ↗</a>
                      )}
                    </div>
                  </motion.div>
                </div>

                {!full && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-8 bg-gradient-to-br from-white to-[#FBF7EF] rounded-2xl p-5 border border-[#6E7568]/10 shadow-lg"
                  >
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#6E7568]">Spots</span>
                      <span className="text-sm font-bold text-[#26150B]">{spots} / {cls.capacity}</span>
                    </div>
                    <div className="h-3 bg-[#FBF7EF] rounded-full overflow-hidden border border-[#6E7568]/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(cls.registered / cls.capacity) * 100}%` }}
                        transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#6E7568] via-[#7a8578] to-[#6E7568] rounded-full"
                      />
                    </div>
                    {spots <= 5 && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="flex items-center justify-center gap-2 mt-3"
                      >
                        <StarIcon size={12} className="text-[#C05640] animate-pulse" />
                        <span className="text-xs font-bold text-[#C05640]">Only {spots} spots left!</span>
                        <StarIcon size={12} className="text-[#C05640] animate-pulse" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* EXPERIENCE */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#26150B]/10 to-transparent"></div>
              <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-[0.25em]">The Experience</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#26150B]/10 to-transparent"></div>
            </div>
            
            <div className="grid gap-3">
              {settings.landingPage.expectations.map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + (i * 0.1) }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-[#6E7568]/5 shadow-sm hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6E7568] to-[#5a6558] flex items-center justify-center text-[#FBF7EF] mt-0.5 shadow-md">
                    <CheckIcon size={10} className="stroke-[3]" />
                  </div>
                  <span className="text-sm text-[#26150B]/80 font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FOOTER */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center gap-4 text-[#6E7568]/30">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#6E7568]/20"></div>
              <PauseLogo size="sm" />
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#6E7568]/20"></div>
            </div>
          </motion.div>
        </div>

        {/* CTA BUTTON */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5, type: "spring", damping: 20 }}
          className="fixed bottom-0 left-0 w-full z-50 px-5 pb-6 bg-gradient-to-t from-[#FBF7EF] via-[#FBF7EF] to-transparent pt-16"
        >
          <div className="max-w-md mx-auto">
            {showWaitlistConfirm ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-gradient-to-br from-[#26150B] to-[#3d2a1a] text-[#FBF7EF] rounded-[1.5rem] p-6 shadow-2xl text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center mx-auto mb-4">
                  <CheckIcon size={28} />
                </div>
                <h3 className="font-bold text-xl mb-2">You're on the list!</h3>
                <p className="text-sm text-[#FBF7EF]/60 mb-4">We'll notify you if a spot opens.</p>
                <button onClick={() => setShowWaitlistConfirm(false)} className="text-xs font-bold uppercase tracking-widest text-[#FBF7EF]/60 hover:text-[#FBF7EF] border-b border-[#FBF7EF]/20 pb-1">
                  Close
                </button>
              </motion.div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => full ? setShowWaitlistConfirm(true) : onRegister()}
                className={`w-full relative rounded-full py-5 px-8 font-bold text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 text-[#FBF7EF] shadow-2xl ${
                  full ? 'bg-gradient-to-r from-[#26150B] to-[#3d2a1a]' : 'bg-gradient-to-r from-[#6E7568] via-[#7a8578] to-[#6E7568]'
                }`}
                style={{ minHeight: '60px' }}
              >
                {full ? "Join Waitlist" : "Reserve Your Spot"}
              </motion.button>
            )}
            
            {!showWaitlistConfirm && (
              <p className="text-center text-[10px] text-[#26150B]/30 font-bold mt-4 uppercase tracking-widest">
                Secure check-in guaranteed
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
