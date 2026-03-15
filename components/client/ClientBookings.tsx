import React, { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Class, Registration } from '../../types';
import { formatDate } from '../../utils';
import { CalendarIcon, ShareIcon, ArticleIcon, XIcon } from '../../components/Icons';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

interface ClientBookingsProps {
  classes: Class[];
  userRegistrations: Registration[];
  onCancelClick: (reg: Registration) => void;
  onShare: (cls: Class) => void;
  onViewDetails: (cls: Class) => void;
}

export const ClientBookings: React.FC<ClientBookingsProps> = ({ classes, userRegistrations, onCancelClick, onShare, onViewDetails }) => {
    const reducedMotion = useReducedMotion();
    
    const relevant = useMemo(() => 
        userRegistrations.filter(r => {
            const cls = classes.find(c => c.id === r.classId);
            return !!cls;
        }),
        [userRegistrations, classes]
    );

    return (
        <motion.div 
            initial={reducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            className="p-4 sm:p-6 pb-40 max-w-lg mx-auto"
        >
            <div className="flex items-center gap-4 mb-8 sm:mb-10">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <h3 className="text-[10px] font-bold text-[#26150B] uppercase tracking-[3px]">My Bookings</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>

            <AnimatePresence>
            {relevant.length === 0 ? (
                <motion.div 
                    initial={reducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mb-6"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6E7568]/60 via-[#C05640]/30 to-[#6E7568]/60 rounded-[2rem] blur-sm"></div>
                    
                    <div className="relative rounded-[1.9rem] text-center py-16 sm:py-20 px-6 sm:px-8 bg-[#6E7568] shadow-2xl shadow-[#6E7568]/20">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FBF7EF]/10 flex items-center justify-center mx-auto mb-5 sm text-[#FB:mb-6F7EF]/60">
                            <CalendarIcon size={24} />
                        </div>
                        <p className="text-lg sm:text-xl text-[#FBF7EF] mb-3 font-bold">No upcoming sessions</p>
                        <p className="text-xs text-[#FBF7EF]/60 max-w-[200px] mx-auto leading-relaxed font-medium">Join a discovery workshop to start exploring your fascia.</p>
                    </div>
                </motion.div>
            ) : relevant.map(r => {
                const cls = classes.find(c => c.id === r.classId);
                if (!cls) return null;

                return (
                  <motion.div 
                      key={r.id}
                      layout
                      initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
                      whileHover={reducedMotion ? undefined : { y: -4 }}
                      transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="relative mb-6"
                  >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6E7568]/60 via-[#C05640]/30 to-[#6E7568]/60 rounded-[2rem] blur-sm"></div>
                      
                      <div className="relative rounded-[1.9rem] p-5 sm:p-7 bg-[#6E7568] shadow-2xl shadow-[#6E7568]/20">
                        <div className="flex justify-between items-start mb-5 sm:mb-6">
                          <div className="flex-1 pr-4">
                              <h3 className="text-lg sm:text-xl text-[#FBF7EF] mb-2 font-bold leading-tight drop-shadow-sm">{cls.title}</h3>
                              <p className="text-[10px] font-bold text-[#FBF7EF]/80 uppercase tracking-widest flex items-center gap-2">
                                <CalendarIcon size={12} />
                                {formatDate(cls.dateTime)}
                              </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full border text-[10px] sm:text-[9px] font-bold uppercase tracking-wider shadow-sm h-fit cursor-pointer transition-all hover:scale-105
                              ${r.status === 'confirmed' ? 'bg-[#FBF7EF] border-[#FBF7EF] text-[#6E7568]' : 'bg-[#462B2C]/40 border-[#462B2C]/50 text-[#FBF7EF]'}
                          `}>
                             {r.status === 'payment_review' ? 'In Review' : r.status}
                          </div>
                        </div>
                        
                        {r.status === 'payment_review' && (
                            <div className="bg-[#462B2C]/30 p-4 rounded-xl mb-5 sm:mb-6 border border-gray-500/30">
                                <p className="text-xs text-[#FBF7EF] mb-1 font-bold">Payment Verifying...</p>
                                <p className="text-[10px] text-[#FBF7EF]/70">Admin will confirm your spot shortly.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                            <motion.button 
                                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                                onClick={() => onViewDetails(cls)}
                                className={`bg-gradient-to-r from-[#FBF7EF] via-[#fff] to-[#FBF7EF] text-[#26150B] rounded-2xl py-3 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-[#FBF7EF]/20 transition-all flex flex-col items-center justify-center gap-1 hover:shadow-xl hover:-translate-y-0.5 ${focusRing}`}
                            >
                                <ArticleIcon size={16} /> View
                            </motion.button>
                            <motion.button 
                                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                                onClick={() => onShare(cls)}
                                className={`bg-gradient-to-r from-[#FBF7EF]/20 to-[#FBF7EF]/5 border border-[#FBF7EF]/20 backdrop-blur-sm text-[#FBF7EF] rounded-2xl py-3 text-[10px] font-bold uppercase tracking-wider hover:from-[#FBF7EF]/30 hover:to-[#FBF7EF]/10 transition-all flex flex-col items-center justify-center gap-1 hover:shadow-md hover:-translate-y-0.5 ${focusRing}`}
                            >
                                <ShareIcon size={16} /> Share
                            </motion.button>
                            <motion.button 
                                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                                onClick={() => onCancelClick(r)}
                                className={`bg-transparent border border-[#FBF7EF]/20 text-[#FBF7EF]/80 rounded-2xl py-3 text-[10px] font-bold uppercase tracking-wider hover:bg-[#C05640]/20 hover:border-[#C05640]/50 hover:text-[#FBF7EF] transition-all flex flex-col items-center justify-center gap-1 hover:shadow-md hover:-translate-y-0.5 ${focusRing}`}
                            >
                                <XIcon size={16} /> Cancel
                            </motion.button>
                        </div>
                      </div>
                  </motion.div>
                );
            })}
            </AnimatePresence>
        </motion.div>
    );
};

export default ClientBookings;
