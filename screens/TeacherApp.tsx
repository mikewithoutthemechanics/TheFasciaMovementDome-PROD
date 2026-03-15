
import React, { useState } from 'react';
import { User, AdminSection, Class, Venue, Registration, AppSettings, ChatMessage, Teacher } from '../types';
import { AdminChatView } from '../components/ChatWidget';
import * as Icons from '../components/Icons';
import { formatDate, formatTime, isDomeVenue, getEndTimeWithReset } from '../utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../components/Toast';

//=============== Teacher Header Bar ===============//
interface TeacherHeaderBarProps {
    user: User;
    onSignOut: () => void;
    showBack: boolean;
    onBack: () => void;
    onMenuClick: () => void;
}

const TeacherHeaderBar: React.FC<TeacherHeaderBarProps> = ({ user, onSignOut, showBack, onBack, onMenuClick }) => (
    <header className="px-4 sm:px-6 py-3 sm:py-4 pt-safe flex items-center justify-between sticky top-0 z-50 transition-all duration-300 bg-[#FBF7EF]/80 backdrop-blur-xl border-b border-[#26150B]/5">
        <div className="flex items-center gap-3 sm:gap-4">
            <AnimatePresence mode="wait">
                {showBack ? (
                    <motion.button 
                        key="back"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onBack}
                        className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#26150B] border border-[#26150B]/10 bg-[#26150B]/5 hover:bg-[#26150B]/10 transition-colors"
                    >
                        <Icons.ArrowLeftIcon size={18} />
                    </motion.button>
                ) : (
                    <motion.button 
                        key="menu"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onMenuClick}
                        className="lg:hidden w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#26150B] border border-[#26150B]/10 bg-[#26150B]/5 hover:bg-[#26150B]/10 transition-colors"
                    >
                        <Icons.MenuIcon size={18} />
                    </motion.button>
                )}
            </AnimatePresence>
            
            {showBack ? null : (
                <div className="flex flex-col justify-center h-full">
                    <p className="text-[10px] sm:text-[9px] font-bold text-[#26150B] uppercase tracking-[2px] opacity-60 leading-tight">Welcome</p>
                    <h1 className="text-lg sm:text-xl text-[#26150B] font-bold tracking-tight leading-none mt-0.5">{user.name.split(" ")[0]}</h1>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onSignOut} 
                className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#26150B]/40 hover:text-[#26150B] transition-colors"
                title="Log Out"
            >
                <Icons.LogOutIcon size={20} />
            </motion.button>
            
            <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-[#6E7568] flex items-center justify-center shadow-lg shadow-[#6E7568]/20 text-[#FBF7EF] font-bold text-sm select-none border border-[#FBF7EF]/50">
                {user.name.charAt(0)}
            </div>
        </div>
    </header>
);

//=============== Teacher Sidebar ===============//
interface TeacherSidebarProps {
    user: User;
    onSignOut: () => void;
    activeSection: AdminSection;
    onSectionChange: (section: AdminSection) => void;
    isOpen: boolean;
    onClose: () => void;
}
const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ user, onSignOut, activeSection, onSectionChange, isOpen, onClose }) => {
    const navItems = [
        { key: "my_classes", label: "My Classes", icon: <Icons.CalendarIcon /> },
        { key: "schedule", label: "Schedule", icon: <Icons.CalendarIcon /> },
        { key: "attendees", label: "Attendees", icon: <Icons.UsersIcon /> },
        { key: "messages", label: "Messages", icon: <Icons.MessageIcon /> },
        { key: "profile", label: "Profile", icon: <Icons.UsersIcon /> },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#26150B]/80 backdrop-blur-sm z-[90] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Drawer - SAGE BACKGROUND */}
            <aside className={`
                fixed top-0 left-0 h-full w-64 bg-[#6E7568] border-r border-[#FBF7EF]/10 z-[100] transition-transform duration-300 ease-in-out overflow-y-auto
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:fixed lg:h-screen lg:overflow-y-auto
                flex flex-col p-6 shadow-2xl
            `}>
                <div className="pb-8 border-b border-[#FBF7EF]/10 flex justify-between items-center">
                    <span className="text-[#FBF7EF] text-sm font-bold tracking-wide">The Fascia Movement</span>
                    <button onClick={onClose} className="lg:hidden text-[#FBF7EF] hover:bg-[#FBF7EF]/10 rounded-full p-1"><Icons.XIcon /></button>
                </div>
                
                <div className="mt-6 mb-2 text-[10px] font-bold text-[#FBF7EF]/40 tracking-[2px] uppercase">Menu</div>
                
                <nav className="flex-1 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button key={item.key} onClick={() => { onSectionChange(item.key as AdminSection); onClose(); }}
                                className={`flex items-center gap-4 w-full p-3 rounded-xl text-left transition-all duration-200 text-xs font-semibold tracking-wide cursor-pointer 
                                ${activeSection === item.key 
                                    ? 'bg-[#FBF7EF] text-[#26150B] shadow-lg shadow-[#26150B]/10' 
                                    : 'text-[#FBF7EF]/70 hover:bg-[#FBF7EF]/10 hover:text-[#FBF7EF]'}`}>
                            {React.cloneElement(item.icon, { size: 18, className: 'text-inherit' })}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="pt-6 border-t border-[#FBF7EF]/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-[#26150B] flex items-center justify-center text-[#FBF7EF] text-xs font-bold border border-[#FBF7EF]/20">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#FBF7EF]">{user.name}</p>
                            <p className="text-[10px] text-[#FBF7EF]/60">Teacher</p>
                        </div>
                    </div>
                    <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 btn-glass rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer py-3">
                        <Icons.LogOutIcon size={16} /> Log Out
                    </button>
                </div>
            </aside>
        </>
    );
};

//=============== Teacher My Classes Screen ===============//
interface TeacherMyClassesProps {
    user: User;
    classes: Class[];
    registrations: Registration[];
    venues: Venue[];
    teachers: Teacher[];
    onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}
const TeacherMyClasses: React.FC<TeacherMyClassesProps> = ({ user, classes, registrations, venues, teachers, onShowToast }) => {
    // SECURITY: Previously showed ALL published upcoming classes regardless of assignment.
    // Now filters to only classes where teacherId matches the authenticated user's ID.
    // Falls back to email match for legacy data where teacherId may not be set.
    const myClasses = classes
        .filter(c => {
            if (c.status !== 'published' || new Date(c.dateTime) <= new Date()) return false;
            const teacher = teachers.find(t => t.id === c.teacherId);
            return c.teacherId === user.id || teacher?.email === user.email;
        })
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const handleShare = (cls: Class) => {
        const link = `https://app.pausefmd.co.za/invite/${cls.slug}`;
        const text = `Join me at ${cls.title}\n${formatDate(cls.dateTime)}\n${link}`;
        navigator.clipboard.writeText(text);
        onShowToast("Invite link copied to clipboard!", "success");
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end border-b border-[#26150B]/5 pb-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">My Classes</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Classes assigned to you</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-[#6E7568]/10 shadow-sm">
                    <p className="text-[9px] text-[#6E7568] font-bold uppercase tracking-wider mb-1">Upcoming</p>
                    <p className="text-3xl font-extrabold text-[#26150B]">{myClasses.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#6E7568]/10 shadow-sm">
                    <p className="text-[9px] text-[#6E7568] font-bold uppercase tracking-wider mb-1">Total Registrations</p>
                    <p className="text-3xl font-extrabold text-[#26150B]">
                        {registrations.filter(r => myClasses.some(c => c.id === r.classId)).length}
                    </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#6E7568]/10 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[9px] text-[#6E7568] font-bold uppercase tracking-wider mb-1">This Week</p>
                    <p className="text-3xl font-extrabold text-[#26150B]">
                        {myClasses.filter(c => {
                            const clsDate = new Date(c.dateTime);
                            const now = new Date();
                            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            return clsDate >= now && clsDate <= weekFromNow;
                        }).length}
                    </p>
                </div>
            </div>

            {/* Classes List */}
            <div className="space-y-4">
                {myClasses.length > 0 ? myClasses.map(cls => {
                    const venue = venues.find(v => v.id === cls.venueId);
                    const teacher = teachers.find(i => i.id === cls.teacherId);
                    const classRegistrations = registrations.filter(r => r.classId === cls.id && r.status === 'confirmed');
                    
                    return (
                        <div key={cls.id} className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row justify-between gap-6 group hover:-translate-y-0.5">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#FBF7EF] w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-[#6E7568] border border-[#6E7568]/10 shadow-inner group-hover:scale-105 transition-transform">
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{new Date(cls.dateTime).toLocaleString('en-US', { month: 'short' })}</span>
                                    <span className="text-2xl font-extrabold leading-none">{new Date(cls.dateTime).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="text-[#26150B] font-bold text-lg mb-1 group-hover:text-[#6E7568] transition-colors">{cls.title}</h3>
                                    <div className="flex flex-wrap gap-3 text-xs text-[#6E7568] font-medium">
                                        <span className="flex items-center gap-1.5 bg-[#FBF7EF] px-2 py-1 rounded-md">
                                            <Icons.ClockIcon size={12}/> 
                                            {(() => { 
                                                const isDome = isDomeVenue(venue?.name); 
                                                const { endTime, hasBuffer } = getEndTimeWithReset(cls.dateTime, cls.duration, isDome, cls.allowDomeResetOverride); 
                                                return `${formatTime(cls.dateTime)} - ${endTime}${hasBuffer ? ' (+reset)' : ''}`; 
                                            })()}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-[#FBF7EF] px-2 py-1 rounded-md">
                                            <Icons.UsersIcon size={12}/> {classRegistrations.length}/{cls.capacity}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-[#FBF7EF] px-2 py-1 rounded-md">
                                            <Icons.MapPinIcon size={12}/> {venue?.name}
                                        </span>
                                    </div>
                                    {teacher && (
                                        <p className="text-[10px] text-[#6E7568] mt-2">
                                            Teacher: {teacher.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center bg-[#FBF7EF]/50 p-2 rounded-xl border border-[#FBF7EF]">
                                <button onClick={() => handleShare(cls)} className="p-2.5 hover:bg-white hover:shadow-md rounded-lg text-[#6E7568] transition-all" title="Copy Invite Link">
                                    <Icons.ShareIcon size={18}/>
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
                        No upcoming classes assigned to you.
                    </div>
                )}
            </div>
        </div>
    );
};

//=============== Teacher Schedule Screen ===============//
interface TeacherScheduleProps {
    classes: Class[];
}
const TeacherSchedule: React.FC<TeacherScheduleProps> = ({ classes }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const getClassesForDay = (day: number) => {
        return classes.filter(c => {
            const d = new Date(c.dateTime);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year && c.status === 'published';
        });
    };

    const upcomingClasses = classes
        .filter(c => c.status === "published" && new Date(c.dateTime) > new Date())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
        .slice(0, 10);

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end border-b border-[#26150B]/5 pb-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Schedule</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Your teaching calendar</p>
                </div>
            </div>

            {/* Calendar View */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-[#6E7568]/10 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-3 hover:bg-[#FBF7EF] rounded-full text-[#6E7568] transition-colors">
                        <Icons.ArrowLeftIcon size={18}/>
                    </button>
                    <h2 className="text-lg md:text-xl font-bold text-[#26150B] uppercase tracking-widest">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-3 hover:bg-[#FBF7EF] rounded-full text-[#6E7568] rotate-180 transition-colors">
                        <Icons.ArrowLeftIcon size={18}/>
                    </button>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 md:gap-4 mb-4 text-center overflow-x-auto">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-[10px] font-bold text-[#6E7568]/50 uppercase tracking-widest">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 md:gap-4 overflow-x-auto">
                    {blanks.map(b => <div key={`blank-${b}`} className="aspect-square"></div>)}
                    {days.map(day => {
                        const dayClasses = getClassesForDay(day);
                        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                        return (
                            <div key={day} className={`aspect-square min-w-[70px] sm:min-w-auto rounded-xl md:rounded-2xl border ${isToday ? 'border-[#6E7568] bg-[#FBF7EF] shadow-inner' : 'border-[#6E7568]/10 hover:border-[#6E7568]/30'} p-1 md:p-2 relative transition-all duration-300`}>
                                <span className={`text-[10px] md:text-xs font-bold ${isToday ? 'text-[#6E7568]' : 'text-[#6E7568]/50'} absolute top-2 left-3`}>{day}</span>
                                <div className="mt-6 space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)] custom-scrollbar pr-1">
                                    {dayClasses.map(c => (
                                        <div key={c.id} className="bg-[#6E7568] text-[#FBF7EF] text-[8px] md:text-[9px] p-1 rounded-lg truncate font-medium">
                                            {formatTime(c.dateTime)} {c.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming Classes List */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Upcoming Sessions
                </h3>
                <div className="space-y-3">
                    {upcomingClasses.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-3 bg-[#FBF7EF]/50 rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-[#26150B]">{c.title}</p>
                                <p className="text-[10px] text-[#6E7568]">{formatDate(c.dateTime)} at {formatTime(c.dateTime)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-[#26150B]">{c.registered}/{c.capacity}</p>
                                <p className="text-[9px] text-[#6E7568]">registered</p>
                            </div>
                        </div>
                    ))}
                    {upcomingClasses.length === 0 && (
                        <p className="text-center py-4 text-[#6E7568]/40 text-sm italic">No upcoming classes</p>
                    )}
                </div>
            </div>
        </div>
    );
};

//=============== Teacher Attendees Screen ===============//
interface TeacherAttendeesProps {
    user: User;
    classes: Class[];
    registrations: Registration[];
    teachers: Teacher[];
}
const TeacherAttendees: React.FC<TeacherAttendeesProps> = ({ user, classes, registrations, teachers }) => {
    const [filterClass, setFilterClass] = useState("all");
    
    // SECURITY: Previously showed attendees for ALL published classes.
    // Now scoped to only classes assigned to this teacher.
    const myClassIds = classes
        .filter(c => {
            if (c.status !== 'published') return false;
            const teacher = teachers.find(t => t.id === c.teacherId);
            return c.teacherId === user.id || teacher?.email === user.email;
        })
        .map(c => c.id);
    
    const filtered = registrations.filter(r => 
        myClassIds.includes(r.classId) && 
        (filterClass === "all" || r.classId === filterClass)
    );

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#26150B]/5 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Attendees</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">View class attendees</p>
                </div>
                <select 
                    value={filterClass} 
                    onChange={e => setFilterClass(e.target.value)} 
                    className="w-full sm:w-auto bg-white border border-[#6E7568]/10 text-[#26150B] font-medium rounded-full p-3 px-6 text-xs outline-none focus:border-[#6E7568]/50 shadow-sm hover:shadow-md transition-all appearance-none cursor-pointer"
                >
                    <option value="all" className="bg-white">All Classes</option>
                    {classes.filter(c => myClassIds.includes(c.id)).map(c => (
                        <option key={c.id} value={c.id} className="bg-white">{c.title}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-4">
                {filtered.map(r => {
                    const cls = classes.find(c => c.id === r.classId);
                    return (
                        <div key={r.id} className="bg-white p-5 rounded-[1.5rem] border border-[#6E7568]/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#FBF7EF] flex items-center justify-center text-[#6E7568] font-bold text-sm shadow-inner border border-[#6E7568]/5">
                                        {r.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-[#26150B] font-bold text-sm">{r.userName}</h4>
                                        <p className="text-[10px] text-[#6E7568] font-medium flex items-center gap-1">
                                            <Icons.CalendarIcon size={10} /> {cls?.title}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-3 flex gap-2 flex-wrap">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase border tracking-wide ${
                                        r.status === 'confirmed' ? 'border-[#6E7568]/20 text-[#6E7568] bg-[#6E7568]/10' :
                                        r.status === 'payment_review' ? 'border-[#763417]/20 text-[#763417] bg-[#763417]/10' :
                                        'border-red-500/20 text-red-500 bg-red-500/5'
                                    }`}>{r.status.replace('_', ' ')}</span>
                                </div>
                                {r.notes && (
                                    <div className="mt-3 bg-[#FBF7EF]/50 p-3 rounded-xl border border-[#6E7568]/5">
                                        <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Icons.InfoIcon size={10}/> Notes / Injuries
                                        </p>
                                        <p className="text-[10px] text-[#26150B] italic leading-relaxed">{r.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
                        No attendees found.
                    </div>
                )}
            </div>
        </div>
    );
};

//=============== Teacher Profile Screen ===============//
interface TeacherProfileProps {
    user: User;
    onUpdateUser?: (updates: Partial<User>) => void;
}
const TeacherProfile: React.FC<TeacherProfileProps> = ({ user, onUpdateUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: user.name,
        email: user.email,
        phone: user.phone || ''
    });

    return (
        <div className="animate-fade-in space-y-8">
            <div className="border-b border-[#26150B]/5 pb-4">
                <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Profile</h1>
                <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage your account</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-[#6E7568]/10 shadow-sm">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-[#6E7568] flex items-center justify-center text-[#FBF7EF] text-2xl font-bold shadow-lg">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#26150B]">{user.name}</h2>
                        <p className="text-sm text-[#6E7568]">Teacher</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-[#6E7568]/10 text-[#6E7568] rounded-full text-xs font-bold uppercase">
                            Active
                        </span>
                    </div>
                </div>

                {!isEditing ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-[#FBF7EF]/50 rounded-xl">
                            <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Email</p>
                            <p className="text-sm text-[#26150B] font-medium">{user.email}</p>
                        </div>
                        {user.phone && (
                            <div className="p-4 bg-[#FBF7EF]/50 rounded-xl">
                                <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Phone</p>
                                <p className="text-sm text-[#26150B] font-medium">{user.phone}</p>
                            </div>
                        )}
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="btn-primary rounded-full py-3 px-6 text-xs font-bold uppercase tracking-wider"
                        >
                            Edit Profile
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Name</label>
                            <input 
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none focus:border-[#6E7568]/50 transition-all shadow-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Email</label>
                            <input 
                                type="email"
                                value={editForm.email}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none focus:border-[#6E7568]/50 transition-all shadow-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider">Phone</label>
                            <input 
                                type="tel"
                                value={editForm.phone}
                                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none focus:border-[#6E7568]/50 transition-all shadow-sm font-medium"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-3 px-6 border border-[#6E7568]/20 text-[#6E7568] rounded-full text-xs font-bold uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (onUpdateUser) {
                                        onUpdateUser(editForm);
                                    }
                                    setIsEditing(false);
                                }}
                                className="flex-1 btn-primary py-3 px-6 rounded-full text-xs font-bold uppercase tracking-wider"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Permissions Info */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                <h3 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Your Permissions
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#FBF7EF]/50 rounded-xl">
                        <span className="text-sm text-[#26150B]">View assigned classes</span>
                        <Icons.CheckIcon size={18} className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#FBF7EF]/50 rounded-xl">
                        <span className="text-sm text-[#26150B]">View class attendees</span>
                        <Icons.CheckIcon size={18} className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#FBF7EF]/50 rounded-xl">
                        <span className="text-sm text-[#26150B]">View schedule</span>
                        <Icons.CheckIcon size={18} className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                        <span className="text-sm text-[#26150B]">Manage admin settings</span>
                        <Icons.XIcon size={18} className="text-red-400" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                        <span className="text-sm text-[#26150B]">Manage other teachers</span>
                        <Icons.XIcon size={18} className="text-red-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};

//=============== Main Teacher App ===============//
interface TeacherAppProps {
    user: User;
    onSignOut: () => void;
    classes: Class[];
    registrations: Registration[];
    venues: Venue[];
    settings: AppSettings;
    teachers: Teacher[];
    onUpdateUser?: (updates: Partial<User>) => void;
    chatMessages?: ChatMessage[];
    onSendChatMessage?: (content: string, recipientId?: string) => void;
}

export const TeacherApp: React.FC<TeacherAppProps> = ({
    user,
    onSignOut,
    classes,
    registrations,
    venues,
    settings: _settings,
    teachers,
    onUpdateUser,
    chatMessages = [],
    onSendChatMessage
}) => {
    const [activeSection, setActiveSection] = useState<AdminSection>('my_classes');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toast = useToast();
    
    // Chat state
    const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

    return (
        <div className="flex h-screen bg-[#FBF7EF] overflow-hidden font-['Montserrat']">
            <TeacherSidebar 
                user={user} 
                onSignOut={onSignOut} 
                activeSection={activeSection} 
                onSectionChange={setActiveSection}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            
            <main className="flex-1 flex flex-col h-full relative overflow-hidden pb-6">
                <TeacherHeaderBar 
                    user={user} 
                    onSignOut={onSignOut} 
                    showBack={activeSection !== 'my_classes'}
                    onBack={() => setActiveSection('my_classes')}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar relative">
                    {/* Background Grain/Noise */}
                    <div className="fixed inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0 mix-blend-multiply"></div>
                    
                    <div className="max-w-6xl mx-auto relative z-10">
                        {activeSection === 'my_classes' && (
                            <TeacherMyClasses 
                                user={user}
                                classes={classes} 
                                registrations={registrations} 
                                venues={venues} 
                                teachers={teachers}
                                onShowToast={toast.showToast}
                            />
                        )}
                        {activeSection === 'schedule' && (
                            <TeacherSchedule classes={classes} />
                        )}
                        {activeSection === 'attendees' && (
                            <TeacherAttendees user={user} classes={classes} registrations={registrations} teachers={teachers} />
                        )}
                        {activeSection === 'messages' && (
                            <AdminChatView 
                                currentUser={user}
                                messages={chatMessages}
                                users={[]}
                                onSendMessage={(content, recipientId) => onSendChatMessage?.(content, recipientId)}
                                selectedUserId={selectedChatUserId}
                                onSelectUser={setSelectedChatUserId}
                            />
                        )}
                        {activeSection === 'profile' && (
                            <TeacherProfile user={user} onUpdateUser={onUpdateUser} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
