import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { User, Registration, Class, CreditPackage } from '../../types';
import { formatDate } from '../../utils';
import { 
  Edit3Icon, 
  AwardIcon, 
  CalendarIcon, 
  CheckIcon,
  MailIcon,
  TargetIcon,
  ZapIcon,
  QrCodeIcon,
  CopyIcon,
  CreditCardIcon,
  GiftIcon,
  SparklesIcon,
  ChevronRightIcon
} from '../../components/Icons';
import { PauseLogo } from '../../components/PauseLogo';
import { CREDIT_PACKAGES } from '../../constants';

export interface ClientProfileProps {
  user: User;
  registrations: Registration[];
  classes: Class[];
  onUpdateUser?: (updates: Partial<User>) => void;
}

export const ClientProfile: React.FC<ClientProfileProps> = ({ user, registrations, classes, onUpdateUser }) => {
  const reducedMotion = useReducedMotion();
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showCreditPackages, setShowCreditPackages] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_purchasingPackage, _setPurchasingPackage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    sport: user.sport || '',
    classReminderOptIn: user.classReminderOptIn ?? true
  });
  
  // Stats calculation - memoized to avoid recalculation on every render
  const attendedCount = useMemo(() => 
    registrations.filter(r => {
      const cls = classes.find(c => c.id === r.classId);
      return cls && new Date(cls.dateTime) < new Date() && r.status === 'confirmed';
    }).length,
    [registrations, classes]
  );

  const upcomingCount = useMemo(() => 
    registrations.filter(r => {
      const cls = classes.find(c => c.id === r.classId);
      return cls && new Date(cls.dateTime) > new Date() && r.status === 'confirmed';
    }).length,
    [registrations, classes]
  );

  const totalCredits = user.credits || 0;

  const pastClasses = useMemo(() => 
    registrations
      .filter(r => {
        const cls = classes.find(c => c.id === r.classId);
        return cls && new Date(cls.dateTime) < new Date() && r.status === 'confirmed';
      })
      .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()),
    [registrations, classes]
  );

  const copyMemberId = () => {
    navigator.clipboard.writeText(user.id.slice(0, 8).toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate member since date
  const memberSince = registrations.length > 0 
    ? new Date(Math.min(...registrations.map(r => new Date(r.registeredAt).getTime()))).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'New Member';

  // Achievement badges based on attendance
  const achievements = [];
  if (attendedCount >= 1) achievements.push({ icon: '🌱', label: 'First Step', desc: 'Attended first class' });
  if (attendedCount >= 5) achievements.push({ icon: '🔥', label: 'On Fire', desc: '5 classes completed' });
  if (attendedCount >= 10) achievements.push({ icon: '⭐', label: 'Dedicated', desc: '10 classes completed' });
  if (attendedCount >= 20) achievements.push({ icon: '👑', label: 'Elite', desc: '20 classes completed' });

  return (
    <motion.div 
      initial={reducedMotion ? undefined : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-6 pb-40 max-w-lg mx-auto"
    >
      {/* Section Header */}
      <div className="flex items-center justify-center gap-4 mb-8 opacity-70">
        <div className="h-px w-8 bg-[#26150B]/20"></div>
        <h3 className="text-[10px] font-bold text-[#26150B] uppercase tracking-[3px]">My Profile</h3>
        <div className="h-px w-8 bg-[#26150B]/20"></div>
      </div>

      {/* Profile Hero Card */}
      <motion.div 
        initial={reducedMotion ? undefined : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        {/* Background gradient decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6E7568] to-[#4a524e] rounded-[2.5rem] shadow-2xl shadow-[#6E7568]/30" />
        
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FBF7EF]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FBF7EF]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-8">
          {/* Avatar and Edit Button */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FBF7EF] to-[#e8e4dc] flex items-center justify-center text-[#26150B] text-3xl font-bold shadow-xl border-4 border-[#FBF7EF]/30"
              >
                {user.name.charAt(0)}
              </motion.div>
              {/* Status indicator */}
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#6E7568] flex items-center justify-center">
                <CheckIcon size={10} className="text-white stroke-[3]" />
              </div>
            </div>
            
            <h2 className="text-2xl text-[#FBF7EF] font-bold mb-1">{user.name}</h2>
            <p className="text-xs text-[#FBF7EF]/60 font-medium flex items-center gap-2">
              <MailIcon size={12} />
              {user.email}
            </p>
            {user.sport && (
              <div className="mt-2 px-3 py-1 rounded-full bg-[#FBF7EF]/10 border border-[#FBF7EF]/20">
                <p className="text-[10px] font-bold text-[#FBF7EF]/80 uppercase tracking-wider flex items-center gap-1">
                  <TargetIcon size={10} />
                  {user.sport}
                </p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#26150B]/20 backdrop-blur-sm rounded-2xl p-4 border border-[#FBF7EF]/5 text-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center mx-auto mb-2">
                <CheckIcon size={14} className="text-[#FBF7EF]" />
              </div>
              <p className="text-2xl font-bold text-[#FBF7EF] mb-1">{attendedCount}</p>
              <p className="text-[8px] uppercase tracking-widest text-[#FBF7EF]/50 font-bold">Attended</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#26150B]/20 backdrop-blur-sm rounded-2xl p-4 border border-[#FBF7EF]/5 text-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center mx-auto mb-2">
                <CalendarIcon size={14} className="text-[#FBF7EF]" />
              </div>
              <p className="text-2xl font-bold text-[#FBF7EF] mb-1">{upcomingCount}</p>
              <p className="text-[8px] uppercase tracking-widest text-[#FBF7EF]/50 font-bold">Upcoming</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#26150B]/20 backdrop-blur-sm rounded-2xl p-4 border border-[#FBF7EF]/5 text-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center mx-auto mb-2">
                <ZapIcon size={14} className="text-[#FBF7EF]" />
              </div>
              <p className="text-2xl font-bold text-[#FBF7EF] mb-1">{totalCredits}</p>
              <p className="text-[8px] uppercase tracking-widest text-[#FBF7EF]/50 font-bold">Credits</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Achievements Section */}
      {achievements.length > 0 && (
        <motion.div 
          initial={reducedMotion ? undefined : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h4 className="text-xs font-bold text-[#26150B]/60 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
            <AwardIcon size={14} />
            Achievements
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {achievements.map((achievement, idx) => (
              <motion.div
                key={idx}
                initial={reducedMotion ? undefined : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="flex-shrink-0 bg-gradient-to-br from-[#6E7568] to-[#5a6155] rounded-2xl p-4 min-w-[100px] text-center shadow-lg"
              >
                <span className="text-2xl mb-1 block">{achievement.icon}</span>
                <p className="text-[10px] font-bold text-[#FBF7EF] mb-0.5">{achievement.label}</p>
                <p className="text-[8px] text-[#FBF7EF]/50">{achievement.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Digital Member Card */}
      <motion.div 
        initial={reducedMotion ? undefined : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h4 className="text-xs font-bold text-[#26150B]/60 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
          <CreditCardIcon size={14} />
          Member Card
        </h4>
        <motion.div 
          whileHover={{ scale: 1.01 }}
          onClick={() => setShowMemberCard(true)}
          className="rounded-[1.5rem] overflow-hidden shadow-xl cursor-pointer group"
        >
          {/* Card with gradient */}
          <div className="relative p-6 bg-gradient-to-br from-[#6E7568] via-[#5a6155] to-[#4a524e]">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FBF7EF]/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FBF7EF]/3 rounded-full translate-y-1/3 -translate-x-1/4" />
            
            {/* Card content */}
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <PauseLogo size="sm" light />
                  <div className="h-4 w-px bg-[#FBF7EF]/20" />
                  <p className="text-[9px] uppercase tracking-[2px] font-bold text-[#FBF7EF]/50">Member Access</p>
                </div>
                <div className="bg-white/90 p-1.5 rounded-lg shadow-lg premium-card">
                  <QrCodeIcon size={28} className="text-[#26150B]"/>
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/40 mb-1">Member ID</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-[#FBF7EF] tracking-wider">{user.id.toUpperCase().slice(0, 8)}...</p>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); copyMemberId(); }}
                      className="text-[#FBF7EF]/40 hover:text-[#FBF7EF] transition-colors"
                    >
                      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                    </motion.button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/40 mb-1">Member Since</p>
                  <p className="text-sm font-bold text-[#FBF7EF]">{memberSince}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tap to expand hint */}
          <div className="bg-[#26150B]/5 px-6 py-2 text-center">
            <p className="text-[9px] text-[#26150B]/40 font-medium">Tap to view full card</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={reducedMotion ? undefined : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <h4 className="text-xs font-bold text-[#26150B]/60 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
          <SparklesIcon size={14} />
          Quick Actions
        </h4>
        <div className="space-y-2">
          <motion.button 
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowReferralModal(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-[#6E7568]/10 flex items-center justify-center">
              <GiftIcon size={18} className="text-[#6E7568]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#26150B]">Refer a Friend</p>
              <p className="text-[10px] text-[#26150B]/50">Share the experience & earn rewards</p>
            </div>
            <ChevronRightIcon size={16} className="text-[#26150B]/30" />
          </motion.button>
          <motion.button 
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-[#6E7568]/10 flex items-center justify-center">
              <Edit3Icon size={18} className="text-[#6E7568]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#26150B]">Edit Profile</p>
              <p className="text-[10px] text-[#26150B]/50">Update your personal information</p>
            </div>
            <ChevronRightIcon size={16} className="text-[#26150B]/30" />
          </motion.button>
          <motion.button 
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreditPackages(true)}
            disabled={true}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#6E7568]/50 border border-[#6E7568]/20 shadow-sm transition-all opacity-60 cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-full bg-[#FBF7EF]/20 flex items-center justify-center">
              <GiftIcon size={18} className="text-[#FBF7EF]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#FBF7EF]">Buy Credits</p>
              <p className="text-[10px] text-[#FBF7EF]/60">Temporarily unavailable - contact us</p>
            </div>
            <ChevronRightIcon size={16} className="text-[#FBF7EF]/40" />
          </motion.button>
        </div>
      </motion.div>

      {/* Session History */}
      <motion.div 
        initial={reducedMotion ? undefined : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h4 className="text-xs font-bold text-[#26150B]/60 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
          <CalendarIcon size={14} />
          Session History
        </h4>
        <div className="space-y-2">
          {pastClasses.length > 0 ? (
            pastClasses.slice(0, 5).map((r, idx) => {
              const cls = classes.find(c => c.id === r.classId);
              if (!cls) return null;
              return (
                <motion.div 
                  key={r.id}
                  initial={reducedMotion ? undefined : { x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.45 + idx * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6E7568] to-[#5a6155] flex items-center justify-center text-[#FBF7EF] shadow-md">
                    <CheckIcon size={16} />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-[#26150B] leading-tight mb-1">{cls.title}</h5>
                    <p className="text-[10px] text-[#26150B]/50 uppercase tracking-wider">{formatDate(cls.dateTime)}</p>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-[#6E7568]/10">
                    <p className="text-[9px] font-bold text-[#6E7568] uppercase">Completed</p>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="text-center py-12 rounded-2xl bg-[#26150B]/5 border border-gray-200">
              <div className="w-16 h-16 rounded-full bg-[#6E7568]/10 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon size={24} className="text-[#6E7568]/40" />
              </div>
              <p className="text-sm text-[#26150B]/40 font-medium mb-1">No workshops yet</p>
              <p className="text-[10px] text-[#26150B]/30">Your journey begins here!</p>
            </div>
          )}
          {pastClasses.length > 5 && (
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 text-center text-[10px] font-bold text-[#6E7568] uppercase tracking-wider hover:text-[#26150B] transition-colors"
            >
              View All ({pastClasses.length} sessions)
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Full Member Card Modal */}
      <AnimatePresence>
        {showMemberCard && (
          <motion.div 
            initial={reducedMotion ? undefined : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/90 backdrop-blur-md z-[200] flex items-center justify-center p-6"
            onClick={() => setShowMemberCard(false)}
          >
            <motion.div 
              initial={reducedMotion ? undefined : { scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              {/* Full Card */}
              <div className="rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="relative p-8 bg-gradient-to-br from-[#6E7568] via-[#5a6155] to-[#4a524e]">
                  {/* Decorative */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#FBF7EF]/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#FBF7EF]/3 rounded-full translate-y-1/3 -translate-x-1/4" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#FBF7EF]/2 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  
                  <div className="relative z-10">
                    {/* Member Tier Badge - Show tier based on attendance */}
                    {(() => {
                      const attendedCount = registrations.filter(r => r.userId === user.id && r.status === 'confirmed').length;
                      let tierBadge = null;
                      if (attendedCount >= 20) {
                        tierBadge = <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-lg">Founder</span>;
                      } else if (attendedCount >= 12) {
                        tierBadge = <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-violet-600 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-lg">Ambassador</span>;
                      } else if (attendedCount >= 6) {
                        tierBadge = <span className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-lg">Regular</span>;
                      } else if (attendedCount >= 1) {
                        tierBadge = <span className="px-3 py-1 bg-gradient-to-r from-slate-400 to-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-lg">Starter</span>;
                      }
                      return tierBadge;
                    })()}

                    {/* QR Code */}
                    <div className="flex justify-center mb-8">
                      <div className="bg-white p-4 rounded-2xl shadow-xl premium-card">
                        <QrCodeIcon size={120} className="text-[#26150B]"/>
                      </div>
                    </div>

                    {/* Member Info */}
                    <div className="text-center mb-6">
                      <h3 className="text-xl text-[#FBF7EF] font-bold mb-1">{user.name}</h3>
                      <p className="text-xs text-[#FBF7EF]/60 font-medium">{user.sport || 'General Member'}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#26150B]/20 backdrop-blur-sm rounded-xl p-3 text-center border border-[#FBF7EF]/5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[#FBF7EF]/40 mb-1">Member ID</p>
                        <p className="text-xs font-mono text-[#FBF7EF] tracking-wider">{user.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="bg-[#26150B]/20 backdrop-blur-sm rounded-xl p-3 text-center border border-[#FBF7EF]/5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[#FBF7EF]/40 mb-1">Member Since</p>
                        <p className="text-xs font-bold text-[#FBF7EF]">{memberSince}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMemberCard(false)}
                className="w-full mt-6 py-4 bg-[#FBF7EF] rounded-full text-[10px] font-bold uppercase tracking-widest text-[#26150B] shadow-lg"
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral Modal */}
      <AnimatePresence>
        {showReferralModal && (
          <motion.div 
            initial={reducedMotion ? undefined : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/90 backdrop-blur-md z-[200] flex items-end justify-center pb-safe"
            onClick={() => setShowReferralModal(false)}
          >
            <motion.div 
              initial={reducedMotion ? undefined : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-[#FBF7EF] rounded-t-[2.5rem] p-8 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1 rounded-full bg-[#26150B]/10" />
              </div>
              
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6E7568] to-[#5a6155] flex items-center justify-center mx-auto mb-6 shadow-lg">
                <GiftIcon size={28} className="text-[#FBF7EF]" />
              </div>
              
              <h2 className="text-2xl text-[#26150B] mb-2 font-bold tracking-tight text-center">Refer a Friend</h2>
              <p className="text-xs text-[#26150B]/60 text-center mb-8">Share the experience and earn rewards when they join!</p>
              
              {/* Referral Code */}
              <div className="bg-[#6E7568]/5 p-6 rounded-2xl mb-6 border border-[#6E7568]/10">
                <p className="text-[10px] font-bold text-[#6E7568] uppercase tracking-widest mb-2 text-center">Your Referral Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-2xl font-mono font-bold text-[#26150B] tracking-wider">{user.id.slice(0, 8).toUpperCase()}</p>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      navigator.clipboard.writeText(user.id.slice(0, 8).toUpperCase());
                      alert('Referral code copied!');
                    }}
                    className="p-2 rounded-lg bg-[#6E7568]/10 hover:bg-[#6E7568]/20 transition-colors"
                  >
                    <CopyIcon size={16} className="text-[#6E7568]" />
                  </motion.button>
                </div>
              </div>

              {/* Share Options */}
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => {
                    const shareText = `Join me at The Fascia Movement Dome! Use my referral code: ${user.id.slice(0, 8).toUpperCase()} for special benefits. Book your first class at https://tfmd-booking-app.vercel.app`;
                    navigator.clipboard.writeText(shareText);
                    alert('Referral message copied!');
                  }}
                  className="flex-1 bg-[#26150B]/5 hover:bg-[#26150B]/10 p-4 rounded-2xl flex flex-col items-center gap-2 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FBF7EF] flex items-center justify-center shadow-sm text-[#26150B]">
                    <CopyIcon size={18}/>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#26150B]/60">Copy Link</span>
                </button>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Join me at The Fascia Movement Dome! Use my referral code: ${user.id.slice(0, 8).toUpperCase()} for special benefits. Book your first class at https://tfmd-booking-app.vercel.app`)}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 bg-[#26150B]/5 hover:bg-[#26150B]/10 p-4 rounded-2xl flex flex-col items-center gap-2 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm text-white">
                    <CopyIcon size={18}/>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#26150B]/60">WhatsApp</span>
                </a>
              </div>

              <button 
                onClick={() => setShowReferralModal(false)} 
                className="w-full bg-white border border-gray-200 text-[#26150B] rounded-full py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#FBF7EF] premium-hover"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Purchase Modal */}
      <AnimatePresence>
        {showCreditPackages && (
          <motion.div 
            initial={reducedMotion ? undefined : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/90 backdrop-blur-md z-[200] flex items-end justify-center pb-safe"
            onClick={() => setShowCreditPackages(false)}
          >
            <motion.div 
              initial={reducedMotion ? undefined : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-[#FBF7EF] rounded-t-[2.5rem] p-8 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1 rounded-full bg-[#26150B]/10" />
              </div>
              
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6E7568] to-[#5a6155] flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CreditCardIcon size={28} className="text-[#FBF7EF]" />
              </div>
              
              <h2 className="text-2xl text-[#26150B] mb-2 font-bold tracking-tight text-center">Purchase Credits</h2>
              
              {/* Payment Unavailable Notice */}
              <div className="w-full bg-[#6E7568]/10 border-2 border-[#6E7568]/30 rounded-xl p-4 mb-4 text-center">
                <p className="font-bold text-[#26150B] text-sm">Credit Purchase Temporarily Unavailable</p>
                <p className="text-xs text-[#26150B]/60 mt-1">Please contact us to purchase credits</p>
              </div>
              
              <p className="text-xs text-[#26150B]/60 text-center mb-4">Credit packages (R150 each):</p>
              
              {/* Credit Packages List - Disabled */}
              <div className="space-y-4 mb-6">
                {CREDIT_PACKAGES.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((pkg: CreditPackage) => (
                  <div
                    key={pkg.id}
                    className="w-full bg-white/50 border-2 border-[#6E7568]/20 rounded-2xl p-4 text-left opacity-60"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-base font-bold text-[#26150B]">{pkg.name}</h3>
                        <p className="text-[10px] text-[#26150B]/50">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#6E7568]">R{pkg.price}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#26150B]">{pkg.credits} credits</span>
                      {pkg.bonusCredits && pkg.bonusCredits > 0 && (
                        <span className="px-2 py-0.5 bg-[#6E7568]/10 text-[10px] font-bold text-[#6E7568] rounded-full">
                          +{pkg.bonusCredits} bonus
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowCreditPackages(false)} 
                className="w-full bg-white border border-gray-200 text-[#26150B] rounded-full py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#FBF7EF] premium-hover"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={reducedMotion ? undefined : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/90 backdrop-blur-md z-[200] flex items-end justify-center pb-safe"
            onClick={() => setIsEditing(false)}
          >
            <motion.div 
              initial={reducedMotion ? undefined : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-[#FBF7EF] rounded-t-[2.5rem] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1 rounded-full bg-[#26150B]/10" />
              </div>
              
              <h2 className="text-2xl text-[#26150B] mb-2 font-bold tracking-tight text-center">Edit Profile</h2>
              <p className="text-xs text-[#26150B]/60 text-center mb-8">Update your personal information</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-[#26150B]/70 mb-2 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#26150B]/5 border border-gray-200 rounded-xl p-4 text-sm text-[#26150B] outline-none focus:border-[#6E7568] transition-colors"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#26150B]/70 mb-2 uppercase tracking-wider">Email</label>
                  <input 
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-[#26150B]/5 border border-gray-200 rounded-xl p-4 text-sm text-[#26150B] outline-none focus:border-[#6E7568] transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#26150B]/70 mb-2 uppercase tracking-wider">Phone</label>
                  <input 
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-[#26150B]/5 border border-gray-200 rounded-xl p-4 text-sm text-[#26150B] outline-none focus:border-[#6E7568] transition-colors"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#26150B]/70 mb-2 uppercase tracking-wider">Sport / Activity</label>
                  <input 
                    type="text"
                    value={editForm.sport}
                    onChange={e => setEditForm({ ...editForm, sport: e.target.value })}
                    className="w-full bg-[#26150B]/5 border border-gray-200 rounded-xl p-4 text-sm text-[#26150B] outline-none focus:border-[#6E7568] transition-colors"
                    placeholder="e.g., Yoga, Running, CrossFit"
                  />
                </div>
                
                {/* Notification Preferences */}
                <div className="bg-[#6E7568]/5 rounded-xl p-4 space-y-3">
                  <label className="block text-xs font-bold text-[#26150B]/70 uppercase tracking-wider">Notification Preferences</label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#26150B] font-medium">Class Reminders</p>
                      <p className="text-xs text-[#26150B]/50">Get reminded about upcoming classes</p>
                    </div>
                    <button 
                      onClick={() => setEditForm({ ...editForm, classReminderOptIn: !editForm.classReminderOptIn })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${editForm.classReminderOptIn ? 'bg-[#6E7568]' : 'bg-[#26150B]/20'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${editForm.classReminderOptIn ? 'left-7' : 'left-1'}`}></span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="flex-1 bg-transparent border border-gray-200 text-[#26150B] rounded-full py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#26150B]/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (onUpdateUser) {
                      onUpdateUser({
                        name: editForm.name,
                        email: editForm.email,
                        phone: editForm.phone,
                        sport: editForm.sport,
                        classReminderOptIn: editForm.classReminderOptIn
                      });
                    }
                    setIsEditing(false);
                  }} 
                  className="flex-1 bg-[#6E7568] text-[#FBF7EF] rounded-full py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#5a6155] shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClientProfile;
