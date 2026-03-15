import React, { useState, useEffect } from 'react';
import * as Icons from '../Icons';

interface TeacherApplication {
    id: string;
    name: string;
    email: string;
    phone?: string;
    bio?: string;
    specialties: string[];
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: string;
}

interface AdminTeacherApprovalsProps {
    onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminTeacherApprovals: React.FC<AdminTeacherApprovalsProps> = ({ onShowToast }) => {
    const [applications, setApplications] = useState<TeacherApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data - replace with actual API call
        setTimeout(() => {
            setApplications([
                {
                    id: '1',
                    name: 'Sarah Johnson',
                    email: 'sarah@example.com',
                    phone: '082 123 4567',
                    bio: 'Certified yoga instructor with 5 years experience',
                    specialties: ['Yoga', 'Meditation'],
                    status: 'pending',
                    appliedAt: new Date().toISOString()
                }
            ]);
            setLoading(false);
        }, 500);
    }, []);

    const handleApprove = (id: string) => {
        setApplications(apps => apps.map(app => 
            app.id === id ? { ...app, status: 'approved' } : app
        ));
        onShowToast?.('Teacher application approved', 'success');
    };

    const handleReject = (id: string) => {
        setApplications(apps => apps.map(app => 
            app.id === id ? { ...app, status: 'rejected' } : app
        ));
        onShowToast?.('Teacher application rejected', 'info');
    };

    const pendingApps = applications.filter(a => a.status === 'pending');

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E7568]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pendingApps.length === 0 ? (
                <div className="text-center py-8 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-2xl border border-dashed border-[#6E7568]/10">
                    No pending teacher applications
                </div>
            ) : (
                pendingApps.map(app => (
                    <div key={app.id} className="bg-white p-5 rounded-[1.5rem] border border-[#6E7568]/10 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#6E7568]/10 flex items-center justify-center text-[#6E7568] font-bold text-lg">
                                    {app.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-[#26150B] font-bold text-sm">{app.name}</h4>
                                    <p className="text-[10px] text-[#6E7568]">{app.email}</p>
                                    {app.phone && <p className="text-[10px] text-[#6E7568]">{app.phone}</p>}
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-[9px] font-bold uppercase">
                                Pending
                            </span>
                        </div>
                        
                        {app.bio && (
                            <div className="mt-4 bg-[#FBF7EF] p-3 rounded-xl">
                                <p className="text-[10px] text-[#6E7568] uppercase font-bold mb-1">Bio</p>
                                <p className="text-xs text-[#26150B]">{app.bio}</p>
                            </div>
                        )}
                        
                        <div className="mt-3 flex flex-wrap gap-1">
                            {app.specialties?.map(spec => (
                                <span key={spec} className="px-2 py-0.5 bg-[#6E7568]/10 text-[#6E7568] rounded-full text-[9px] font-medium">
                                    {spec}
                                </span>
                            ))}
                        </div>

                        <div className="mt-4 flex gap-3">
                            <button 
                                onClick={() => handleApprove(app.id)}
                                className="flex-1 bg-[#6E7568] text-[#FBF7EF] hover:bg-[#6E7568]/90 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                                <Icons.CheckIcon size={14} /> Approve
                            </button>
                            <button 
                                onClick={() => handleReject(app.id)}
                                className="flex-1 bg-red-50 text-red-500 hover:bg-red-100 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                                <Icons.XIcon size={14} /> Reject
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default AdminTeacherApprovals;
