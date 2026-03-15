import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Class, Venue, Registration } from '../types';
import { formatDate, formatTime, getVenue, spotsLeft, isFull, getEndTimeWithReset, isDomeVenue } from '../utils';
import { CalendarIcon, MapPinIcon, ClockIcon, ShareIcon, CheckIcon } from '../components/Icons';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

//=============== ClassCard Component (Internal) ===============//
interface ClassCardProps {
  cls: Class;
  venues: Venue[];
  onRegister: (cls: Class) => void;
  userRegistrations: Registration[];
  onViewDetails: (cls: Class) => void;
  onShare: (cls: Class) => void;
}

const ClassCard: React.FC<ClassCardProps> = React.memo(({ cls, venues, onRegister, userRegistrations, onViewDetails, onShare }) => {
  const reducedMotion = useReducedMotion();
  const venue = getVenue(cls.venueId, venues);
  const full = isFull(cls);
  const spots = spotsLeft(cls);
  const pct = (cls.registered / cls.capacity) * 100;
  const isRegistered = userRegistrations.some(r => r.classId === cls.id);

  // Calculate end time with reset buffer for dome venues
  const isDome = isDomeVenue(venue?.name);
  const { endTime, hasBuffer, nextAvailable } = getEndTimeWithReset(
    cls.dateTime,
    cls.duration,
    isDome,
    cls.allowDomeResetOverride
  );
  const startTime = formatTime(cls.dateTime);

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-6"
    >
      {/* Gradient Border */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6E7568]/60 via-[#C05640]/30 to-[#6E7568]/60 rounded-[2rem] blur-sm"></div>

      <div className="relative rounded-[1.9rem] overflow-hidden bg-[#6E7568] shadow-2xl shadow-[#6E7568]/20">
        <div className="p-6 sm:p-8 pb-4">
          {/* Header Row: Badge & Sport Tags */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-wrap gap-2">
              {cls.sportTags.slice(0, 2).map(t => (
                <span key={t} className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#FBF7EF]/20 to-[#FBF7EF]/5 text-[#FBF7EF] border border-[#FBF7EF]/20">
                  {t}
                </span>
              ))}
            </div>
            {/* Registered Badge */}
            {isRegistered ? (
              <div className="bg-[#FBF7EF] text-[#6E7568] text-[10px] sm:text-[9px] font-extrabold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wide">
                <CheckIcon size={10} className="stroke-[3]" /> Registered
              </div>
            ) : full ? (
              <div className="bg-[#26150B]/40 backdrop-blur-md border border-[#FBF7EF]/20 text-[#FBF7EF] text-[10px] sm:text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                Waitlist
              </div>
            ) : null}
          </div>

          <h3 className="text-xl sm:text-2xl text-[#FBF7EF] font-bold tracking-tight leading-snug mb-3 pr-4">{cls.title}</h3>

          {/* Info Rows with Hover Effects */}
          <div className="space-y-3">
            <motion.div whileHover={{ x: 6 }} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FBF7EF]/20 to-[#FBF7EF]/5 flex items-center justify-center">
                <CalendarIcon size={16} className="text-[#FBF7EF]" />
              </div>
              <span className="text-xs text-[#FBF7EF] font-medium tracking-wide">{formatDate(cls.dateTime)}</span>
            </motion.div>
            <motion.div whileHover={{ x: 6 }} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FBF7EF]/20 to-[#FBF7EF]/5 flex items-center justify-center">
                <ClockIcon size={16} className="text-[#FBF7EF]" />
              </div>
              <span className="text-xs text-[#FBF7EF] font-medium tracking-wide">
                {startTime} - {endTime}
                {hasBuffer && (
                  <span className="ml-2 px-2 py-0.5 bg-[#FBF7EF]/20 text-[#FBF7EF] text-[10px] sm:text-[9px] rounded-full">
                    +{nextAvailable} reset
                  </span>
                )}
              </span>
            </motion.div>
            <motion.div whileHover={{ x: 6 }} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FBF7EF]/20 to-[#FBF7EF]/5 flex items-center justify-center">
                <MapPinIcon size={16} className="text-[#FBF7EF]" />
              </div>
              <span className="text-xs text-[#FBF7EF] font-medium tracking-wide opacity-90 line-clamp-1">{venue?.name}</span>
            </motion.div>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-[9px] font-bold uppercase tracking-widest text-[#FBF7EF]/50">{full ? "Full Capacity" : "Availability"}</span>
            <div className="flex items-center gap-4">
              <span className="text-[11px] sm:text-[11px] font-bold text-[#FBF7EF] tracking-wider">{spots} spots left</span>
              <button onClick={(e) => { e.stopPropagation(); onShare(cls); }} className={`text-[#FBF7EF]/60 hover:text-[#FBF7EF] transition-colors ${focusRing} rounded-full p-1`} title="Share">
                <ShareIcon size={16} />
              </button>
            </div>
          </div>

          <div className="h-2 bg-[#FBF7EF]/10 w-full mb-4 rounded-full overflow-hidden border border-[#FBF7EF]/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#FBF7EF] via-[#fff] to-[#FBF7EF] rounded-full shadow-[0_0_10px_rgba(251,247,239,0.5)]"
            />
          </div>

          {/* Low Stock Alert */}
          {spots <= 5 && !full && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-[#C05640]"></motion.span>
              <span className="text-xs font-bold text-[#C05640]">Only {spots} spots left!</span>
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-[#C05640]"></motion.span>
            </motion.div>
          )}

          <div onClick={e => e.stopPropagation()}>
            {isRegistered ? (
              <motion.button
                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                onClick={() => onViewDetails(cls)}
                className={`w-full rounded-full py-4 px-6 text-[11px] sm:text-[10px] font-bold text-[#FBF7EF] bg-gradient-to-r from-[#FBF7EF]/20 to-[#FBF7EF]/5 border border-[#FBF7EF]/20 backdrop-blur-sm hover:from-[#FBF7EF]/30 hover:to-[#FBF7EF]/10 transition-all ${focusRing}`}
              >
                View Details
              </motion.button>
            ) : (
              <motion.button
                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                onClick={() => onRegister(cls)}
                className={`w-full rounded-full py-4 px-6 text-[11px] sm:text-[10px] font-extrabold transition-all shadow-lg ${focusRing} ${full
                  ? 'bg-gradient-to-r from-[#26150B] to-[#3d2a1a] text-[#FBF7EF] border border-[#FBF7EF]/10'
                  : 'bg-gradient-to-r from-[#FBF7EF] via-[#fff] to-[#FBF7EF] text-[#26150B] shadow-[#FBF7EF]/20 hover:shadow-[#FBF7EF]/40'
                  }`}
              >
                {full ? "Join Waitlist" : (
                  <span className="flex items-center justify-center gap-2">
                    Register
                    <span className="opacity-40">•</span>
                    {cls.price > 0 ? `R ${cls.price}` : "Free"}
                  </span>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ClassCard.displayName = 'ClassCard';

//=============== ClientClasses Component (Main Export) ===============//
export interface ClientClassesProps {
  classes: Class[];
  venues: Venue[];
  onRegister: (cls: Class) => void;
  registrations: Registration[];
  onViewDetails: (cls: Class) => void;
  onShare: (cls: Class) => void;
}

export const ClientClasses: React.FC<ClientClassesProps> = ({ classes, venues, onRegister, registrations, onViewDetails, onShare }) => {
  const reducedMotion = useReducedMotion();
  
  // Memoize filtered classes to avoid recalculation on every render
  const filteredClasses = useMemo(() =>
    classes.filter(c => c.status === 'published'),
    [classes]
  );

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0 }}
      className="px-4 sm:p-5 pb-40 max-w-lg mx-auto"
    >
      {/* Gradient Section Divider */}
      <div className="flex items-center gap-4 mb-8 sm:mb-10">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <h3 className="text-[10px] font-bold text-[#26150B] uppercase tracking-[3px]">Upcoming Sessions</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>

      <div className="space-y-4">
        {filteredClasses.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            venues={venues}
            onRegister={onRegister}
            userRegistrations={registrations}
            onViewDetails={onViewDetails}
            onShare={onShare}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ClientClasses;
