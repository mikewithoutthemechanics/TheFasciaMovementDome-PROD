import React from 'react';
import { motion } from 'framer-motion';
import { Class, Registration, Venue, AdminSection } from '../../types';
import * as Icons from '../../components/Icons';
import { formatDate, formatTime, isDomeVenue, getEndTimeWithReset } from '../../utils';

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactElement<{ size?: number }>;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, onClick }) => (
  <div 
    onClick={onClick}
    className="relative rounded-2xl p-5 flex items-center justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
  >
    {/* Gradient Border */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#6E7568]/30 via-[#C05640]/15 to-[#6E7568]/30 p-[1px]">
      <div className="absolute inset-0 rounded-2xl bg-white"></div>
    </div>
    
    <div className="relative z-10 flex items-center justify-between w-full">
      <div>
        <p className="text-[9px] text-[#6E7568] font-bold uppercase tracking-wider mb-1 opacity-80">{label}</p>
        <p className="text-2xl font-extrabold text-[#26150B] leading-none tracking-tight">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6E7568]/10 to-[#6E7568]/5 flex items-center justify-center text-[#6E7568] shadow-md group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 20 })}
      </div>
    </div>
  </div>
);

// Admin Dashboard Props
interface AdminDashboardProps {
  classes: Class[];
  registrations: Registration[];
  venues: Venue[];
  onNavigate: (section: AdminSection) => void;
  onCopyInvite: () => void;
  activeSection: AdminSection;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  classes, 
  registrations, 
  venues, 
  onNavigate, 
  onCopyInvite, 
  activeSection 
}) => {
  const totalRegistered = registrations.length;
  const upcomingClasses = classes
    .filter(c => c.status === "published" && new Date(c.dateTime) > new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  const nextClass = upcomingClasses[0];
  const pendingPayments = registrations.filter(r => r.status === 'payment_review').length;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header with selector on left, logo on right */}
      <div className="flex justify-between items-end border-b border-[#26150B]/5 pb-4">
        {/* Section Selector on Left */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('dashboard')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'dashboard' ? 'bg-[#6E7568] text-[#FBF7EF]' : 'bg-[#FBF7EF] text-[#26150B]/60 hover:bg-[#26150B]/5'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => onNavigate('classes')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'classes' ? 'bg-[#6E7568] text-[#FBF7EF]' : 'bg-[#FBF7EF] text-[#26150B]/60 hover:bg-[#26150B]/5'}`}
          >
            Classes
          </button>
          <button 
            onClick={() => onNavigate('attendees')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'attendees' ? 'bg-[#6E7568] text-[#FBF7EF]' : 'bg-[#FBF7EF] text-[#26150B]/60 hover:bg-[#26150B]/5'}`}
          >
            Attendees
          </button>
        </div>
        {/* Logo on Right */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#26150B] bg-[#FBF7EF] px-3 py-1 rounded-full border border-[#26150B]/5">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>
      
      {/* HERO: Next Class Focus */}
      {nextClass ? (
        <div className="bg-gradient-to-br from-[#6E7568] to-[#5a6155] rounded-[2rem] p-8 text-[#FBF7EF] shadow-[0_20px_40px_-12px_rgba(110,117,104,0.4)] relative overflow-hidden border border-[#FBF7EF]/10 group">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute top-0 right-0 p-8 opacity-10 transform group-hover:scale-110 transition-transform duration-700">
            <Icons.CalendarIcon size={140} />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#FBF7EF]/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 border border-[#FBF7EF]/20 shadow-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span> Next Session
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight drop-shadow-sm">{nextClass.title}</h2>
              <p className="text-sm opacity-90 font-medium flex items-center gap-2 bg-[#26150B]/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Icons.ClockIcon size={14} /> {formatDate(nextClass.dateTime)} • {formatTime(nextClass.dateTime)}
              </p>
            </div>
            
            <div className="flex items-center gap-6 bg-[#FBF7EF]/10 p-6 rounded-2xl backdrop-blur-md border border-[#FBF7EF]/20 shadow-inner">
              <div className="text-center">
                <p className="text-3xl font-bold leading-none">{nextClass.registered}</p>
                <p className="text-[9px] uppercase tracking-widest opacity-60 font-bold mt-1">Going</p>
              </div>
              <div className="h-10 w-px bg-[#FBF7EF]/20"></div>
              <div className="text-center">
                <p className="text-3xl font-bold leading-none">{nextClass.capacity - nextClass.registered}</p>
                <p className="text-[9px] uppercase tracking-widest opacity-60 font-bold mt-1">Open</p>
              </div>
              <div className="h-10 w-px bg-[#FBF7EF]/20"></div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#FBF7EF] text-[#6E7568] flex items-center justify-center font-bold text-xs shadow-lg ring-4 ring-[#FBF7EF]/20">
                  {Math.round((nextClass.registered / nextClass.capacity) * 100)}%
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 flex gap-3">
            <button 
              onClick={() => onNavigate('attendees')} 
              className="bg-[#FBF7EF] text-[#26150B] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Icons.UsersIcon size={14} /> Manage Attendees
            </button>
            <button 
              onClick={onCopyInvite} 
              className="bg-[#FBF7EF]/10 backdrop-blur-sm text-[#FBF7EF] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#FBF7EF]/20 transition-all border border-[#FBF7EF]/30 flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Icons.ShareIcon size={14} /> Copy Invite
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#FBF7EF]/50 border-2 border-dashed border-[#6E7568]/20 rounded-[2rem] p-12 text-center hover:bg-[#FBF7EF] transition-colors group">
          <div className="w-16 h-16 bg-[#6E7568]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#6E7568] group-hover:scale-110 transition-transform">
            <Icons.CalendarIcon size={24} />
          </div>
          <p className="text-[#6E7568] font-bold mb-3 text-lg">No upcoming classes</p>
          <button 
            onClick={() => onNavigate('classes')} 
            className="px-6 py-3 bg-[#6E7568] text-[#FBF7EF] rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Schedule a class
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total Members" 
          value={totalRegistered} 
          icon={<Icons.UsersIcon />} 
          color="#462B2C" 
          onClick={() => onNavigate('attendees')} 
        />
        <StatCard 
          label="Live Classes" 
          value={upcomingClasses.length} 
          icon={<Icons.CalendarIcon />} 
          color="#6E7568" 
          onClick={() => onNavigate('classes')} 
        />
        <StatCard 
          label="Action Required" 
          value={pendingPayments} 
          icon={<Icons.AlertIcon />} 
          color="#26150B" 
          onClick={() => onNavigate('attendees')} 
        />
        <StatCard 
          label="Est. Revenue" 
          value={`R ${registrations.reduce((acc, r) => {
            const c = classes.find(c => c.id === r.classId);
            return acc + (c?.price || 0);
          }, 0)}`} 
          icon={<Icons.TrendUpIcon />} 
          color="#462B2C" 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Schedule List */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm premium-card">
          <div className="flex justify-between items-center mb-6 border-b border-[#FBF7EF] pb-4">
            <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Upcoming Schedule
            </h3>
            <button 
              onClick={() => onNavigate('classes')} 
              className="text-[10px] font-bold text-[#6E7568] hover:text-[#26150B] bg-[#FBF7EF] px-3 py-1 rounded-full transition-colors"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {upcomingClasses.length > 0 ? upcomingClasses.slice(0, 5).map(c => (
              <div 
                key={c.id} 
                className="flex justify-between items-center p-4 hover:bg-[#FBF7EF]/50 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-[#6E7568]/10 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#FBF7EF] w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[#6E7568] border border-[#6E7568]/10 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="text-[9px] font-bold uppercase tracking-wide">
                      {new Date(c.dateTime).toLocaleString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-extrabold leading-none">
                      {new Date(c.dateTime).getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#26150B] group-hover:text-[#6E7568] transition-colors">{c.title}</p>
                    <p className="text-[10px] text-[#6E7568] font-medium mt-0.5 flex items-center gap-1">
                      <Icons.ClockIcon size={10} /> {
                        (() => { 
                          const v = venues.find(x => x.id === c.venueId); 
                          const id = isDomeVenue(v?.name); 
                          const { endTime: et, hasBuffer: hb } = getEndTimeWithReset(c.dateTime, c.duration, id, c.allowDomeResetOverride); 
                          return `${formatTime(c.dateTime)} - ${et}${hb ? ' (+reset)' : ''}`; 
                        })()
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1.5">
                    <Icons.UsersIcon size={12} className="text-[#6E7568]" />
                    <p className="text-xs font-bold text-[#26150B]">{c.registered}/{c.capacity}</p>
                  </div>
                  <div className="w-24 h-2 bg-[#FBF7EF] rounded-full border border-[#6E7568]/10 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${c.registered >= c.capacity ? 'bg-red-400' : 'bg-[#6E7568]'}`} 
                      style={{ width: `${Math.min((c.registered/c.capacity)*100, 100)}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-[#6E7568]/40 text-xs italic bg-[#FBF7EF]/30 rounded-xl border border-dashed border-[#6E7568]/10">
                No upcoming classes scheduled.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Occupancy Mini-Chart */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="relative rounded-[2rem] p-6">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-[#6E7568]/20 via-[#C05640]/10 to-[#6E7568]/20 p-[1px]">
              <div className="absolute inset-0 rounded-[2rem] bg-white"></div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate('classes')} 
                  className="p-4 rounded-2xl bg-gradient-to-br from-[#6E7568] to-[#5a6155] text-[#FBF7EF] flex flex-col items-center gap-2 text-center group shadow-lg hover:shadow-xl border border-[#FBF7EF]/10"
                >
                  <div className="bg-white/20 p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
                    <Icons.PlusIcon size={18} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide">New Class</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate('attendees')} 
                  className="p-4 rounded-2xl bg-gradient-to-br from-[#6E7568] to-[#5a6155] text-[#FBF7EF] flex flex-col items-center gap-2 text-center group shadow-lg hover:shadow-xl border border-[#FBF7EF]/10"
                >
                  <div className="bg-white/20 p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
                    <Icons.CheckIcon size={18} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide">Check-ins</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Weekly Load Chart */}
          <div className="relative rounded-[2rem] p-6">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-[#6E7568]/20 via-[#C05640]/10 to-[#6E7568]/20 p-[1px]">
              <div className="absolute inset-0 rounded-[2rem] bg-white"></div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Weekly Load
              </h3>
            </div>
            <div className="flex items-end justify-between h-32 gap-2 px-2 relative z-10">
              {upcomingClasses.slice(0, 7).map((c) => {
                const height = Math.max(10, (c.registered / c.capacity) * 100);
                return (
                  <div key={c.id} className="flex flex-col items-center gap-2 flex-1 group h-full justify-end">
                    <div className="w-full bg-[#FBF7EF] rounded-t-lg relative h-full flex items-end overflow-hidden shadow-inner">
                      <div 
                        className="w-full bg-[#6E7568] group-hover:bg-[#C05640] transition-all duration-500 rounded-t-lg shadow-[0_0_10px_rgba(0,0,0,0.1)]" 
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider">
                      {new Date(c.dateTime).toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                  </div>
                );
              })}
              {upcomingClasses.length === 0 && (
                <div className="text-xs text-[#6E7568]/40 w-full text-center self-center italic">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
