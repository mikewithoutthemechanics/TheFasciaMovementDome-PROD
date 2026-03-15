import React, { useState } from 'react';
import { Class, Venue, Teacher, RecurringClassConfig, User, WorkshopCustomField } from '../../types';
import * as Icons from '../Icons';
import { formatDate, formatTime, isDomeVenue, getEndTimeWithReset } from '../../utils';
import { motion } from 'framer-motion';
import { DEFAULT_CLASS_CAPACITY } from '../../constants';

export interface AdminClassesProps {
    classes: Class[];
    venues: Venue[];
    teachers: Teacher[];
    onAddClass: (c: Class) => void;
    onEditClass: (c: Class) => void;
    onDeleteClass: (id: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    currentUser?: User; // Current admin user for permission checks
}

const TIME_OPTIONS = [
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
];

export const AdminClasses: React.FC<AdminClassesProps> = ({ 
    classes, 
    venues, 
    teachers, 
    onAddClass, 
    onEditClass, 
    onDeleteClass, 
    onShowToast, 
    currentUser 
}) => {
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [formData, setFormData] = useState<{
        title?: string;
        dateTime?: string;
        duration?: number;
        capacity?: number;
        venueId?: string;
        teacherId?: string;
        sportTags?: string[];
        status?: "published" | "draft" | "cancelled";
        price?: string;
        allowDomeResetOverride?: boolean;
        classType?: 'class' | 'workshop';
        workshopPrice?: string;
        customFields?: WorkshopCustomField[];
        workshopMaterials?: string[];
        workshopPrerequisites?: string[];
    }>({
        title: "", dateTime: "", duration: 90, capacity: DEFAULT_CLASS_CAPACITY, venueId: venues[0]?.id || "", teacherId: teachers[0]?.id || "", sportTags: [], status: "draft", price: "", allowDomeResetOverride: false, classType: 'class', workshopPrice: '', customFields: [], workshopMaterials: [], workshopPrerequisites: []
    });
    
    // New workshop field state for inputs
    const [newMaterial, setNewMaterial] = useState('');
    const [newPrerequisite, setNewPrerequisite] = useState('');
    const [, setEditingCustomField] = useState<WorkshopCustomField | null>(null);
    
    // Recurring class state
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringConfig, setRecurringConfig] = useState<RecurringClassConfig>({
        frequency: 'weekly',
        endDate: '',
        daysOfWeek: [],
        excludeDates: []
    });

    const openCreateModal = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const defaultDateTime = tomorrow.toISOString().slice(0, 16);

        setFormData({
            title: "", dateTime: defaultDateTime, duration: 90, capacity: DEFAULT_CLASS_CAPACITY, venueId: venues[0]?.id || "", teacherId: teachers[0]?.id || "", sportTags: [], status: "draft", price: "", allowDomeResetOverride: false, classType: 'class', workshopPrice: '', customFields: [], workshopMaterials: [], workshopPrerequisites: [] 
        });
        setNewMaterial('');
        setNewPrerequisite('');
        setEditingCustomField(null);
        setIsRecurring(false);
        setRecurringConfig({ frequency: 'weekly', endDate: '', daysOfWeek: [], excludeDates: [] });
        setModalMode('create');
    };

    const openEditModal = (cls: Class) => {
        const formattedDate = cls.dateTime.slice(0, 16); 
        setFormData({ 
            ...cls, 
            dateTime: formattedDate, 
            price: cls.price.toString(),
            classType: cls.classType || 'class',
            workshopPrice: cls.workshopPrice?.toString() || '',
            customFields: cls.customFields || [],
            workshopMaterials: cls.workshopMaterials || [],
            workshopPrerequisites: cls.workshopPrerequisites || []
        });
        setModalMode('edit');
    };

    const handleSave = () => {
        // Form validation
        if (!formData.title?.trim()) {
            onShowToast("Please enter a class title", "error");
            return;
        }
        if (!formData.dateTime) {
            onShowToast("Please select a date and time", "error");
            return;
        }
        
        // Validate date is in the future
        const classDate = new Date(formData.dateTime);
        if (classDate <= new Date()) {
            onShowToast("Class date must be in the future", "error");
            return;
        }
        
        // Validate price is non-negative
        const price = Number(formData.price) || 0;
        if (price < 0) {
            onShowToast("Price cannot be negative", "error");
            return;
        }
        
        // Calculate class end time
        const classEndTime = new Date(classDate.getTime() + (formData.duration || 90) * 60000);
        
        // Check for 30-minute dome reset buffer requirement
        // Only check for dome venue (check if venue name contains "dome" or is the primary venue)
        const selectedVenue = venues.find(v => v.id === formData.venueId);
        const isDome = selectedVenue?.name.toLowerCase().includes('dome') || selectedVenue?.name.toLowerCase().includes('the dome');
        
        // Check if user is super_admin for the override
        const isSuperAdmin = currentUser?.adminRole === 'super_admin';
        
        if (isDome) {
            // Find classes on the same day at the same venue
            const sameDayClasses = classes.filter(c => {
                const cDate = new Date(c.dateTime);
                const cVenueId = c.venueId;
                return cVenueId === formData.venueId && 
                       cDate.toDateString() === classDate.toDateString() &&
                       c.status !== 'cancelled';
            }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            
            // Check if there's a class that ends too close to this class's start
            for (const existingClass of sameDayClasses) {
                const existingEnd = new Date(existingClass.dateTime).getTime() + existingClass.duration * 60000;
                const gapMs = classDate.getTime() - existingEnd;
                const gapMinutes = gapMs / 60000;
                
                // If gap is positive (existing class ends before new class starts) but less than 30 minutes
                if (gapMinutes > 0 && gapMinutes < 30) {
                    // Allow override only for super_admin
                    if (isSuperAdmin && formData.allowDomeResetOverride) {
                        onShowToast("⚡ Dome reset buffer overridden by super_admin", "warning");
                    } else {
                        onShowToast(`Cannot schedule class. There must be at least 30 minutes between classes for dome reset. Current gap: ${Math.round(gapMinutes)} minutes.`, "error");
                        return;
                    }
                }
                
                // Also check if new class ends too close to an existing class that starts after it
                const existingStart = new Date(existingClass.dateTime).getTime();
                const reverseGapMs = existingStart - classEndTime.getTime();
                const reverseGapMinutes = reverseGapMs / 60000;
                
                if (reverseGapMinutes > 0 && reverseGapMinutes < 30) {
                    if (isSuperAdmin && formData.allowDomeResetOverride) {
                        onShowToast("⚡ Dome reset buffer overridden by super_admin", "warning");
                    } else {
                        onShowToast(`Cannot schedule class. The next class starts only ${Math.round(reverseGapMinutes)} minutes after this one. Need 30 min for dome reset.`, "error");
                        return;
                    }
                }
            }
        }
        
        const workshopPrice = Number(formData.workshopPrice) || undefined;
        const finalData = { 
            ...formData, 
            capacity: formData.capacity || DEFAULT_CLASS_CAPACITY, 
            price,
            workshopPrice: formData.classType === 'workshop' ? workshopPrice : undefined,
            customFields: formData.classType === 'workshop' ? formData.customFields : undefined,
            workshopMaterials: formData.classType === 'workshop' ? formData.workshopMaterials : undefined,
            workshopPrerequisites: formData.classType === 'workshop' ? formData.workshopPrerequisites : undefined
        };

        if (modalMode === 'create') {
            if (isRecurring && recurringConfig.endDate) {
                // Create recurring classes
                const startDate = new Date(formData.dateTime);
                const endDate = new Date(recurringConfig.endDate);
                const classesToCreate: Class[] = [];
                
                const currentDate = new Date(startDate);
                let classCount = 0;
                const maxClasses = 52; // Limit to 1 year of weekly classes
                
                while (currentDate <= endDate && classCount < maxClasses) {
                    const dayOfWeek = currentDate.getDay();
                    
                    // Check if this day is selected (or if no days selected, use start date's day)
                    if (recurringConfig.daysOfWeek.length === 0 || recurringConfig.daysOfWeek.includes(dayOfWeek)) {
                        const cls: Class = {
                            id: crypto.randomUUID(),
                            slug: `class-${Date.now()}-${classCount}`,
                            title: finalData.title || "",
                            dateTime: currentDate.toISOString(),
                            duration: finalData.duration || 90,
                            venueId: finalData.venueId || venues[0]?.id || "",
                            sportTags: finalData.sportTags || [],
                            bodyAreaTags: ["Full Body"],
                            capacity: finalData.capacity || DEFAULT_CLASS_CAPACITY,
                            registered: 0,
                            status: "published",
                            description: "A class to improve movement and reduce stiffness.",
                            price: price,
                            creditCost: 0,
                            allowDomeResetOverride: false // Recurring classes don't use override by default
                        };
                        classesToCreate.push(cls);
                        classCount++;
                    }
                    
                    // Move to next date based on frequency
                    if (recurringConfig.frequency === 'daily') {
                        currentDate.setDate(currentDate.getDate() + 1);
                    } else if (recurringConfig.frequency === 'weekly') {
                        currentDate.setDate(currentDate.getDate() + 7);
                    } else if (recurringConfig.frequency === 'biweekly') {
                        currentDate.setDate(currentDate.getDate() + 14);
                    } else if (recurringConfig.frequency === 'monthly') {
                        currentDate.setMonth(currentDate.getMonth() + 1);
                    }
                }
                
                // Add all classes
                classesToCreate.forEach(cls => onAddClass(cls));
                onShowToast(`Created ${classesToCreate.length} recurring classes!`, "success");
            } else {
                // Create single class
                const cls: Class = {
                    ...finalData as Class,
                    id: crypto.randomUUID(),
                    slug: `class-${Date.now()}`,
                    registered: 0,
                    bodyAreaTags: ["Full Body"],
                    description: "A class to improve movement and reduce stiffness.",
                    status: "published",
                    creditCost: 0,
                    allowDomeResetOverride: formData.allowDomeResetOverride || false
                };
                onAddClass(cls);
                onShowToast("Class created successfully!", "success");
            }
        } else if (modalMode === 'edit') {
            onEditClass(finalData as Class);
            onShowToast("Class updated successfully!", "success");
        }
        setModalMode(null);
        setIsRecurring(false);
        setRecurringConfig({ frequency: 'weekly', endDate: '', daysOfWeek: [], excludeDates: [] });
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this class? This action cannot be undone.")) {
            onDeleteClass(id);
        }
    };

    const handleShare = (cls: Class) => {
        const link = `https://app.pausefmd.co.za/invite/${cls.slug}`;
        const text = `Join me at ${cls.title}\n${formatDate(cls.dateTime)}\n${link}`;
        navigator.clipboard.writeText(text);
        onShowToast("Invite link copied to clipboard!", "success");
    };

    // Simple Calendar Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const getClassesForDay = (day: number) => {
        return classes.filter(c => {
            const d = new Date(c.dateTime);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
        });
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#26150B]/5 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Classes</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage Schedule</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="bg-white rounded-full p-1.5 border border-[#6E7568]/10 flex shadow-sm">
                        <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' : 'text-[#6E7568] hover:bg-[#FBF7EF]'}`}>List</button>
                        <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'calendar' ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' : 'text-[#6E7568] hover:bg-[#FBF7EF]'}`}>Calendar</button>
                    </div>
                    <button onClick={openCreateModal} className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg flex-1 sm:flex-none justify-center hover:bg-[#5a6155] hover:-translate-y-0.5 transition-all">
                        <Icons.PlusIcon size={16}/> New Class
                    </button>
                </div>
            </div>
            
            {viewMode === 'list' ? (
                <div className="grid gap-4">
                    {classes.map(cls => (
                        <div key={cls.id} className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row justify-between gap-6 group hover:-translate-y-0.5 premium-card-hover">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#FBF7EF] w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-[#6E7568] border border-[#6E7568]/10 shadow-inner group-hover:scale-105 transition-transform">
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{new Date(cls.dateTime).toLocaleString('en-US', { month: 'short' })}</span>
                                    <span className="text-2xl font-extrabold leading-none">{new Date(cls.dateTime).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="text-[#26150B] font-bold text-lg mb-1 group-hover:text-[#6E7568] transition-colors">{cls.title}</h3>
                                    <div className="flex flex-wrap gap-3 text-xs text-[#6E7568] font-medium">
                                        <span className="flex items-center gap-1.5 bg-[#FBF7EF] px-2 py-1 rounded-md"><Icons.ClockIcon size={12}/> {(() => { const venue = venues.find(v => v.id === cls.venueId); const isDome = isDomeVenue(venue?.name); const { endTime, hasBuffer } = getEndTimeWithReset(cls.dateTime, cls.duration, isDome, cls.allowDomeResetOverride); return `${formatTime(cls.dateTime)} - ${endTime}${hasBuffer ? ' (+reset)' : ''}`; })()}</span>
                                        <span className="flex items-center gap-1.5 bg-[#FBF7EF] px-2 py-1 rounded-md"><Icons.UsersIcon size={12}/> {cls.registered}/{cls.capacity}</span>
                                        <span className="flex items-center gap-1.5 bg-[#FBF7EF] px-2 py-1 rounded-md text-[#26150B] font-bold">{cls.price > 0 ? `R ${cls.price}` : "Free"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center bg-[#FBF7EF]/50 p-2 rounded-xl border border-[#FBF7EF]">
                                <button onClick={() => handleShare(cls)} className="p-2.5 hover:bg-white hover:shadow-md rounded-lg text-[#6E7568] transition-all" title="Copy Invite Link"><Icons.ShareIcon size={18}/></button>
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cls.status === 'published' ? 'bg-[#6E7568]/10 text-[#6E7568] border-[#6E7568]/20' : 'bg-[#26150B]/5 text-[#26150B]/50 border-[#26150B]/10'}`}>
                                    {cls.status}
                                </span>
                                <button onClick={() => openEditModal(cls)} className="p-2.5 hover:bg-white hover:shadow-md rounded-lg text-[#6E7568] transition-all"><Icons.EditIcon size={18}/></button>
                                <button onClick={() => handleDelete(cls.id)} className="p-2.5 hover:bg-red-50 hover:text-red-500 hover:shadow-md rounded-lg text-[#6E7568]/50 transition-all"><Icons.TrashIcon size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {classes.length === 0 && <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">No classes created yet.</div>}
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-8 border border-[#6E7568]/10 shadow-lg">
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-3 hover:bg-[#FBF7EF] rounded-full text-[#6E7568] transition-colors"><Icons.ArrowLeftIcon size={18}/></button>
                        <h2 className="text-xl font-bold text-[#26150B] uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-3 hover:bg-[#FBF7EF] rounded-full text-[#6E7568] rotate-180 transition-colors"><Icons.ArrowLeftIcon size={18}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-4 mb-4 text-center">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-[10px] font-bold text-[#6E7568]/50 uppercase tracking-widest">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-4">
                        {blanks.map(b => <div key={`blank-${b}`} className="aspect-square"></div>)}
                        {days.map(day => {
                            const dayClasses = getClassesForDay(day);
                            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                            return (
                                <div key={day} className={`aspect-square rounded-2xl border ${isToday ? 'border-[#6E7568] bg-[#FBF7EF] shadow-inner' : 'border-[#6E7568]/10 hover:border-[#6E7568]/30'} p-2 relative group transition-all duration-300`}>
                                    <span className={`text-[10px] font-bold ${isToday ? 'text-[#6E7568]' : 'text-[#6E7568]/50'} absolute top-2 left-3`}>{day}</span>
                                    <div className="mt-6 space-y-1.5 overflow-y-auto max-h-[calc(100%-1.5rem)] custom-scrollbar pr-1">
                                        {dayClasses.map(c => (
                                            <div key={c.id} onClick={() => openEditModal(c)} className="bg-[#6E7568] text-[#FBF7EF] text-[9px] p-1.5 rounded-lg cursor-pointer truncate hover:bg-[#5a6155] shadow-sm font-medium transition-colors">
                                                {formatTime(c.dateTime)} {c.title}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Add Class Shortcut */}
                                    <button 
                                        onClick={() => {
                                            setFormData({
                                                title: "", dateTime: new Date(year, month, day, 9, 0).toISOString().slice(0, 16), duration: 90, capacity: DEFAULT_CLASS_CAPACITY, venueId: venues[0]?.id || "", sportTags: [], status: "draft", price: "" 
                                            });
                                            setModalMode('create');
                                        }}
                                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-[#6E7568] hover:bg-[#6E7568] hover:text-[#FBF7EF] rounded-full p-1.5 transition-all shadow-sm"
                                    >
                                        <Icons.PlusIcon size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {modalMode && (
                 <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#FBF7EF] border border-[#6E7568]/20 rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">{modalMode === 'create' ? 'Create Class' : 'Edit Class'}</h2>
                            <button onClick={() => setModalMode(null)} className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all"><Icons.XIcon /></button>
                        </div>
                        <div className="space-y-6">
                            {/* Class Type Toggle */}
                            <div className="bg-[#FBF7EF] rounded-2xl p-4 border border-[#6E7568]/10">
                                <label className="text-xs font-bold text-[#6E7568] block mb-3 uppercase tracking-wider pl-1">Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, classType: 'class'})}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                                            formData.classType === 'class' 
                                                ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
                                                : 'bg-white text-[#6E7568] border border-[#6E7568]/20 hover:border-[#6E7568]/50'
                                        }`}
                                    >
                                        Class
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, classType: 'workshop'})}
                                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                                            formData.classType === 'workshop' 
                                                ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
                                                : 'bg-white text-[#6E7568] border border-[#6E7568]/20 hover:border-[#6E7568]/50'
                                        }`}
                                    >
                                        Workshop
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Title</label>
                                <input 
                                    className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium" 
                                    value={formData.title} 
                                    onChange={e=>setFormData({...formData, title: e.target.value})} 
                                    placeholder="e.g. Happy Feet" 
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Date & Time</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input 
                                                type="date" 
                                                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none appearance-none shadow-sm font-medium" 
                                                value={formData.dateTime ? formData.dateTime.split('T')[0] : ''} 
                                                onChange={e => {
                                                    const date = e.target.value;
                                                    const time = formData.dateTime ? formData.dateTime.split('T')[1] : "09:00";
                                                    setFormData({...formData, dateTime: `${date}T${time}`});
                                                }} 
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#6E7568]">
                                                <Icons.CalendarIcon size={16} />
                                            </div>
                                        </div>
                                        <div className="relative w-2/5">
                                            <select
                                                className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none appearance-none shadow-sm font-medium"
                                                value={formData.dateTime ? formData.dateTime.split('T')[1]?.slice(0, 5) : "09:00"}
                                                onChange={e => {
                                                    const time = e.target.value;
                                                    const date = formData.dateTime ? formData.dateTime.split('T')[0] : new Date().toISOString().split('T')[0];
                                                    setFormData({...formData, dateTime: `${date}T${time}`});
                                                }}
                                            >
                                                {TIME_OPTIONS.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#6E7568]">
                                                <Icons.ClockIcon size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Price (R)</label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm font-medium" 
                                        value={formData.price} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d+$/.test(val)) setFormData({...formData, price: val});
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Venue</label>
                                    <select 
                                        className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm font-medium" 
                                        value={formData.venueId} 
                                        onChange={e => setFormData({...formData, venueId: e.target.value})}
                                    >
                                        {venues.map(v => <option key={v.id} value={v.id} className="bg-white">{v.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Teacher</label>
                                    <select 
                                        className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm font-medium" 
                                        value={formData.teacherId || ''} 
                                        onChange={e => setFormData({...formData, teacherId: e.target.value})}
                                    >
                                        {teachers.filter(i => i.active).map(i => <option key={i.id} value={i.id} className="bg-white">{i.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Capacity (Fixed)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-4 rounded-2xl bg-[#6E7568]/5 text-[#6E7568] border border-[#6E7568]/5 outline-none cursor-not-allowed font-medium" 
                                    value="15" 
                                    disabled 
                                />
                            </div>
                            {/* Workshop-specific fields */}
                            {formData.classType === 'workshop' && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-4 bg-purple-50 p-4 rounded-2xl border border-purple-200"
                                >
                                    <h3 className="font-bold text-purple-800 text-sm uppercase tracking-wider">Workshop Settings</h3>
                                    
                                    {/* Workshop Price */}
                                    <div>
                                        <label className="text-xs font-bold text-purple-700 block mb-2 uppercase tracking-wider pl-1">Workshop Price (R)</label>
                                        <input 
                                            type="text" 
                                            inputMode="numeric"
                                            className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-purple-200 outline-none shadow-sm font-medium" 
                                            value={formData.workshopPrice} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d+$/.test(val)) setFormData({...formData, workshopPrice: val});
                                            }}
                                            placeholder="0"
                                        />
                                        <p className="text-[10px] text-purple-600 mt-1">Different from class credits - direct payment for workshop</p>
                                    </div>

                                    {/* Workshop Materials */}
                                    <div>
                                        <label className="text-xs font-bold text-purple-700 block mb-2 uppercase tracking-wider pl-1">Materials to Bring</label>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                type="text"
                                                className="flex-1 p-3 rounded-xl bg-white text-[#26150B] border border-purple-200 outline-none shadow-sm font-medium text-sm"
                                                value={newMaterial}
                                                onChange={e => setNewMaterial(e.target.value)}
                                                placeholder="e.g. Yoga mat, Water bottle"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newMaterial.trim()) {
                                                        const updated = [...(formData.workshopMaterials || []), newMaterial.trim()];
                                                        setFormData({...formData, workshopMaterials: updated});
                                                        setNewMaterial('');
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newMaterial.trim()) {
                                                        const updated = [...(formData.workshopMaterials || []), newMaterial.trim()];
                                                        setFormData({...formData, workshopMaterials: updated});
                                                        setNewMaterial('');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        {(formData.workshopMaterials || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(formData.workshopMaterials || []).map((mat, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-2">
                                                        {mat}
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = (formData.workshopMaterials || []).filter((_, i) => i !== idx);
                                                                setFormData({...formData, workshopMaterials: updated});
                                                            }}
                                                            className="text-purple-400 hover:text-purple-600"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Workshop Prerequisites */}
                                    <div>
                                        <label className="text-xs font-bold text-purple-700 block mb-2 uppercase tracking-wider pl-1">Prerequisites</label>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                type="text"
                                                className="flex-1 p-3 rounded-xl bg-white text-[#26150B] border border-purple-200 outline-none shadow-sm font-medium text-sm"
                                                value={newPrerequisite}
                                                onChange={e => setNewPrerequisite(e.target.value)}
                                                placeholder="e.g. Previous yoga experience"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newPrerequisite.trim()) {
                                                        const updated = [...(formData.workshopPrerequisites || []), newPrerequisite.trim()];
                                                        setFormData({...formData, workshopPrerequisites: updated});
                                                        setNewPrerequisite('');
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newPrerequisite.trim()) {
                                                        const updated = [...(formData.workshopPrerequisites || []), newPrerequisite.trim()];
                                                        setFormData({...formData, workshopPrerequisites: updated});
                                                        setNewPrerequisite('');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        {(formData.workshopPrerequisites || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(formData.workshopPrerequisites || []).map((preq, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-2">
                                                        {preq}
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = (formData.workshopPrerequisites || []).filter((_, i) => i !== idx);
                                                                setFormData({...formData, workshopPrerequisites: updated});
                                                            }}
                                                            className="text-purple-400 hover:text-purple-600"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Fields Builder */}
                                    <div>
                                        <label className="text-xs font-bold text-purple-700 block mb-2 uppercase tracking-wider pl-1">Custom Registration Fields</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newField: WorkshopCustomField = {
                                                    id: `field-${Date.now()}`,
                                                    label: '',
                                                    fieldType: 'text',
                                                    required: false,
                                                    placeholder: ''
                                                };
                                                setFormData({
                                                    ...formData,
                                                    customFields: [...(formData.customFields || []), newField]
                                                });
                                                setEditingCustomField(newField);
                                            }}
                                            className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors"
                                        >
                                            + Add Custom Field
                                        </button>
                                        
                                        {(formData.customFields || []).length > 0 && (
                                            <div className="space-y-3 mt-3">
                                                {(formData.customFields || []).map((field, idx) => (
                                                    <div key={field.id} className="bg-white p-3 rounded-xl border border-purple-200">
                                                        <div className="flex gap-2 mb-2">
                                                            <input
                                                                type="text"
                                                                className="flex-1 p-2 rounded-lg border border-purple-200 text-sm font-medium"
                                                                value={field.label}
                                                                onChange={e => {
                                                                    const updated = [...(formData.customFields || [])];
                                                                    updated[idx] = { ...updated[idx], label: e.target.value };
                                                                    setFormData({...formData, customFields: updated});
                                                                }}
                                                                placeholder="Field Label"
                                                            />
                                                            <select
                                                                className="p-2 rounded-lg border border-purple-200 text-sm"
                                                                value={field.fieldType}
                                                                onChange={e => {
                                                                    const updated = [...(formData.customFields || [])];
                                                                    updated[idx] = { ...updated[idx], fieldType: e.target.value as WorkshopCustomField['fieldType'] };
                                                                    setFormData({...formData, customFields: updated});
                                                                }}
                                                            >
                                                                <option value="text">Text</option>
                                                                <option value="textarea">Text Area</option>
                                                                <option value="select">Dropdown</option>
                                                                <option value="checkbox">Checkbox</option>
                                                                <option value="date">Date</option>
                                                                <option value="number">Number</option>
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = (formData.customFields || []).filter((_, i) => i !== idx);
                                                                    setFormData({...formData, customFields: updated});
                                                                }}
                                                                className="text-red-400 hover:text-red-600 p-1"
                                                            >
                                                                <Icons.TrashIcon size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="flex gap-2 items-center">
                                                            <label className="flex items-center gap-2 text-xs text-purple-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.required}
                                                                    onChange={e => {
                                                                        const updated = [...(formData.customFields || [])];
                                                                        updated[idx] = { ...updated[idx], required: e.target.checked };
                                                                        setFormData({...formData, customFields: updated});
                                                                    }}
                                                                    className="rounded border-purple-300"
                                                                />
                                                                Required
                                                            </label>
                                                            {field.fieldType === 'select' && (
                                                                <input
                                                                    type="text"
                                                                    className="flex-1 p-2 rounded-lg border border-purple-200 text-xs"
                                                                    value={field.options?.join(', ') || ''}
                                                                    onChange={e => {
                                                                        const updated = [...(formData.customFields || [])];
                                                                        updated[idx] = { ...updated[idx], options: e.target.value.split(',').map(s => s.trim()) };
                                                                        setFormData({...formData, customFields: updated});
                                                                    }}
                                                                    placeholder="Option1, Option2, Option3"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                            {/* Recurring Class Options - Only for create mode */}
                            {modalMode === 'create' && (
                                <div className="mt-6 pt-6 border-t border-[#6E7568]/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <button 
                                            onClick={() => setIsRecurring(!isRecurring)}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-[#6E7568]' : 'bg-[#6E7568]/20'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isRecurring ? 'left-7' : 'left-1'}`}></span>
                                        </button>
                                        <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider flex items-center gap-2">
                                            <Icons.RepeatIcon size={14} /> Make this a recurring class
                                        </label>
                                    </div>
                                    
                                    {isRecurring && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-4 bg-[#FBF7EF] p-4 rounded-2xl border border-[#6E7568]/10"
                                        >
                                            <div>
                                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Frequency</label>
                                                <select 
                                                    className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm font-medium"
                                                    value={recurringConfig.frequency}
                                                    onChange={e => setRecurringConfig({...recurringConfig, frequency: e.target.value as any})}
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="biweekly">Bi-weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">End Date</label>
                                                <input 
                                                    type="date"
                                                    className="w-full p-3 rounded-xl bg-white text-[#26150B] border border-[#6E7568]/10 outline-none shadow-sm font-medium"
                                                    value={recurringConfig.endDate}
                                                    onChange={e => setRecurringConfig({...recurringConfig, endDate: e.target.value})}
                                                    min={formData.dateTime ? formData.dateTime.split('T')[0] : ''}
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">Days of Week (optional)</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                                        <button
                                                            key={day}
                                                            onClick={() => {
                                                                const days = recurringConfig.daysOfWeek.includes(i)
                                                                    ? recurringConfig.daysOfWeek.filter(d => d !== i)
                                                                    : [...recurringConfig.daysOfWeek, i];
                                                                setRecurringConfig({...recurringConfig, daysOfWeek: days});
                                                            }}
                                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                recurringConfig.daysOfWeek.includes(i)
                                                                    ? 'bg-[#6E7568] text-[#FBF7EF]'
                                                                    : 'bg-white text-[#6E7568] border border-[#6E7568]/20 hover:border-[#6E7568]/50'
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                            {/* Dome Reset Override Option */}
                            {formData.venueId && (() => {
                                const selectedVenue = venues.find(v => v.id === formData.venueId);
                                const isDomeVenue = selectedVenue?.name.toLowerCase().includes('dome') || selectedVenue?.name.toLowerCase().includes('the dome');
                                const isSuperAdmin = currentUser?.adminRole === 'super_admin';
                                return isDomeVenue ? (
                                    <div className={`border rounded-2xl p-4 ${isSuperAdmin ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="domeResetOverride"
                                                checked={formData.allowDomeResetOverride || false}
                                                onChange={e => setFormData({...formData, allowDomeResetOverride: e.target.checked})}
                                                disabled={!isSuperAdmin}
                                                className={`w-5 h-5 rounded border-${isSuperAdmin ? 'amber-300' : 'gray-300'} text-amber-600 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                                            />
                                            <label htmlFor="domeResetOverride" className={`text-sm font-bold ${isSuperAdmin ? 'text-amber-800' : 'text-gray-600'}`}>
                                                {isSuperAdmin ? '⚡ Override 30-min Reset Buffer' : '🔒 30-min Reset Buffer (Superadmin Only)'}
                                            </label>
                                        </div>
                                        <p className={`text-xs mt-2 ml-8 ${isSuperAdmin ? 'text-amber-700' : 'text-gray-500'}`}>
                                            {isSuperAdmin 
                                                ? "Check this to allow back-to-back classes without the 30-minute dome reset gap."
                                                : "Only super admins can override the 30-minute dome reset buffer requirement."}
                                        </p>
                                    </div>
                                ) : null;
                            })()}
                            <button onClick={handleSave} className="w-full btn-primary py-4 rounded-2xl font-bold text-sm tracking-widest uppercase mt-6 shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-[#6E7568] to-[#5a6155] text-[#FBF7EF] hover:shadow-2xl">
                                {modalMode === 'create' ? (isRecurring ? 'Create Recurring Classes' : 'Publish Class') : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClasses;
