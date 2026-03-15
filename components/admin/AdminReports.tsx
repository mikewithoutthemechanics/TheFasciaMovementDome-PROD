import React, { useState, useMemo } from 'react';
import { User, Class, Venue, Registration, ClientAnalytics } from '../../types';
import * as Icons from '../Icons';
import { formatDate, formatTime } from '../../utils';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

// Helper function to export data to CSV
const exportToCSV = (data: Record<string, unknown>[], filename: string, headers: string[]) => {
    if (data.length === 0) return;
    
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(h => {
                const value = row[h];
                // Escape quotes and wrap in quotes if contains comma
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
};

// StatCard component
const StatCard = ({ label, value, icon, onClick }: { label: string, value: string | number, icon: React.ReactElement<{ size?: number }>, color?: string, onClick?: () => void }) => (
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

// Calculate client analytics from registrations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateClientAnalytics = (registrations: Registration[], _classes: Class[], _users: User[]): ClientAnalytics[] => {
    const clientMap = new Map<string, ClientAnalytics>();
    
    // Group registrations by user
    registrations.forEach(r => {
        const existing = clientMap.get(r.userId) || {
            userId: r.userId,
            userName: r.userName,
            userEmail: r.userEmail || '',
            totalBookings: 0,
            attendedBookings: 0,
            cancelledBookings: 0,
            noShows: 0,
            lastAttendance: null,
            firstBooking: null,
            retentionScore: 0,
            churnRisk: 'low' as const,
            favoriteClassType: null,
            averageBookingsPerMonth: 0
        };
        
        existing.totalBookings++;
        
        if (r.status === 'confirmed') {
            existing.attendedBookings++;
            if (!existing.lastAttendance || new Date(r.registeredAt) > new Date(existing.lastAttendance)) {
                existing.lastAttendance = r.registeredAt;
            }
        } else if (r.status === 'cancelled') {
            existing.cancelledBookings++;
        }
        
        if (!existing.firstBooking || new Date(r.registeredAt) < new Date(existing.firstBooking)) {
            existing.firstBooking = r.registeredAt;
        }
        
        clientMap.set(r.userId, existing);
    });
    
    // Calculate retention scores and churn risk
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    return Array.from(clientMap.values()).map(client => {
        // Calculate average bookings per month
        const firstBookingDate = client.firstBooking ? new Date(client.firstBooking) : now;
        const monthsSinceFirst = Math.max(1, (now.getTime() - firstBookingDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        client.averageBookingsPerMonth = client.totalBookings / monthsSinceFirst;
        
        // Calculate retention score (0-100)
        const attendanceRate = client.totalBookings > 0 ? (client.attendedBookings / client.totalBookings) * 100 : 0;
        const recencyBonus = client.lastAttendance && new Date(client.lastAttendance) > thirtyDaysAgo ? 20 : 0;
        const frequencyBonus = client.averageBookingsPerMonth >= 2 ? 15 : client.averageBookingsPerMonth >= 1 ? 10 : 0;
        client.retentionScore = Math.min(100, Math.round(attendanceRate * 0.65 + recencyBonus + frequencyBonus));
        
        // Determine churn risk
        const lastAttendanceDate = client.lastAttendance ? new Date(client.lastAttendance) : sixtyDaysAgo;
        if (lastAttendanceDate < sixtyDaysAgo) {
            client.churnRisk = 'high';
        } else if (lastAttendanceDate < thirtyDaysAgo || client.retentionScore < 50) {
            client.churnRisk = 'medium';
        } else {
            client.churnRisk = 'low';
        }
        
        return client;
    });
};

// AdminReports Props Interface
export interface AdminReportsProps {
    classes: Class[];
    venues: Venue[];
    registrations: Registration[];
    users: User[];
    onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

// AdminReports Component
export const AdminReports: React.FC<AdminReportsProps> = ({ classes, venues, registrations, users, onShowToast }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    
    const analytics = useMemo(() => {
        const now = new Date();
        let filteredRegistrations = registrations;
        
        if (selectedPeriod !== 'all') {
            const daysAgo = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
            const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            filteredRegistrations = registrations.filter(r => new Date(r.registeredAt) >= cutoff);
        }
        
        const clientAnalytics = calculateClientAnalytics(filteredRegistrations, classes, users);
        
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        return {
            totalClients: clientAnalytics.length,
            activeClients: clientAnalytics.filter(c => c.lastAttendance && new Date(c.lastAttendance) > thirtyDaysAgo).length,
            atRiskClients: clientAnalytics.filter(c => c.churnRisk === 'high').length,
            churnedClients: clientAnalytics.filter(c => c.lastAttendance && new Date(c.lastAttendance) < sixtyDaysAgo).length,
            averageRetentionRate: clientAnalytics.length > 0 
                ? Math.round(clientAnalytics.reduce((acc, c) => acc + c.retentionScore, 0) / clientAnalytics.length)
                : 0,
            topClients: clientAnalytics.sort((a, b) => b.retentionScore - a.retentionScore).slice(0, 5),
            recentChurns: clientAnalytics.filter(c => c.churnRisk === 'high').slice(0, 5),
            allClients: clientAnalytics
        };
    }, [registrations, classes, users, selectedPeriod]);
    
    const handleExportClients = () => {
        const data = analytics.allClients.map(c => ({
            'Name': c.userName,
            'Email': c.userEmail,
            'Total Bookings': c.totalBookings,
            'Attended': c.attendedBookings,
            'Cancelled': c.cancelledBookings,
            'Retention Score': c.retentionScore,
            'Churn Risk': c.churnRisk.toUpperCase(),
            'Last Attendance': c.lastAttendance ? formatDate(c.lastAttendance) : 'Never',
            'Avg Bookings/Month': c.averageBookingsPerMonth.toFixed(1)
        }));
        
        if (data.length === 0) {
            onShowToast('No client data available to export', 'warning');
            return;
        }
        
        exportToCSV(data, 'client_analytics', Object.keys(data[0]));
        onShowToast(`Exported ${data.length} clients successfully!`, 'success');
    };
    
    const handleExportRegistrations = () => {
        const data = registrations.map(r => {
            const cls = classes.find(c => c.id === r.classId);
            return {
                'Name': r.userName,
                'Email': r.userEmail || '',
                'Class': cls?.title || '',
                'Date': cls ? formatDate(cls.dateTime) : '',
                'Status': r.status,
                'Payment Status': r.paymentStatus,
                'Registered At': formatDate(r.registeredAt),
                'Notes': r.notes || ''
            };
        });
        
        if (data.length === 0) {
            onShowToast('No registrations available to export', 'warning');
            return;
        }
        
        exportToCSV(data, 'registrations', Object.keys(data[0]));
        onShowToast(`Exported ${data.length} registrations successfully!`, 'success');
    };
    
    const handleExportClasses = () => {
        const data = classes.map(c => {
            const venue = venues.find(v => v.id === c.venueId);
            return {
                'Title': c.title,
                'Date': formatDate(c.dateTime),
                'Time': formatTime(c.dateTime),
                'Duration': c.duration,
                'Capacity': c.capacity,
                'Registered': c.registered,
                'Status': c.status,
                'Price': c.price,
                'Venue': venue?.name || ''
            };
        });
        
        if (data.length === 0) {
            onShowToast('No classes available to export', 'warning');
            return;
        }
        
        exportToCSV(data, 'classes', Object.keys(data[0]));
        onShowToast(`Exported ${data.length} classes successfully!`, 'success');
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Analytics</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Client Retention & Insights</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="bg-white rounded-full p-1.5 border border-[#6E7568]/10 flex shadow-sm">
                        {(['7d', '30d', '90d', 'all'] as const).map(period => (
                            <button 
                                key={period} 
                                onClick={() => setSelectedPeriod(period)} 
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${focusRing} ${selectedPeriod === period ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' : 'text-[#6E7568] hover:bg-[#FBF7EF]'}`}
                            >
                                {period === 'all' ? 'All Time' : `Last ${period.replace('d', ' Days')}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Clients" value={analytics.totalClients} icon={<Icons.UsersIcon />} color="#6E7568" />
                <StatCard label="Active (30d)" value={analytics.activeClients} icon={<Icons.CheckIcon />} color="#22c55e" />
                <StatCard label="At Risk" value={analytics.atRiskClients} icon={<Icons.AlertIcon />} color="#f59e0b" />
                <StatCard label="Churned (60d+)" value={analytics.churnedClients} icon={<Icons.XIcon />} color="#ef4444" />
                <StatCard label="Avg Retention" value={`${analytics.averageRetentionRate}%`} icon={<Icons.TrendUpIcon />} color="#6E7568" />
            </div>
            
            {/* Export Actions */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                <h3 className="text-xs font-bold text-[#26150B] mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Export Data
                </h3>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExportClients} className="btn-primary rounded-xl py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer">
                        <Icons.DownloadIcon size={14} /> Export Clients
                    </button>
                    <button onClick={handleExportRegistrations} className="btn-primary rounded-xl py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer">
                        <Icons.DownloadIcon size={14} /> Export Registrations
                    </button>
                    <button onClick={handleExportClasses} className="btn-primary rounded-xl py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer">
                        <Icons.DownloadIcon size={14} /> Export Classes
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clients */}
                <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                    <h3 className="text-xs font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Top Retained Clients
                    </h3>
                    <div className="space-y-3">
                        {analytics.topClients.map((client, i) => (
                            <div key={client.userId} className="flex items-center justify-between p-3 bg-[#FBF7EF]/50 rounded-xl hover:bg-[#FBF7EF] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#6E7568] text-[#FBF7EF] flex items-center justify-center text-xs font-bold">
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#26150B]">{client.userName}</p>
                                        <p className="text-[10px] text-[#6E7568]">{client.attendedBookings} sessions attended</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="w-16 h-2 bg-[#FBF7EF] rounded-full overflow-hidden border border-[#6E7568]/10">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${client.retentionScore}%` }}></div>
                                    </div>
                                    <p className="text-[9px] font-bold text-[#6E7568] mt-1">{client.retentionScore}%</p>
                                </div>
                            </div>
                        ))}
                        {analytics.topClients.length === 0 && (
                            <div className="text-center py-8 text-[#6E7568]/40 text-xs italic">No client data available</div>
                        )}
                    </div>
                </div>
                
                {/* At Risk Clients */}
                <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                    <h3 className="text-xs font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> At Risk / Churned Clients
                    </h3>
                    <div className="space-y-3">
                        {analytics.recentChurns.map(client => (
                            <div key={client.userId} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                                        <Icons.AlertIcon size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#26150B]">{client.userName}</p>
                                        <p className="text-[10px] text-[#6E7568]">
                                            Last: {client.lastAttendance ? formatDate(client.lastAttendance) : 'Never'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                                    client.churnRisk === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                                }`}>
                                    {client.churnRisk} risk
                                </span>
                            </div>
                        ))}
                        {analytics.recentChurns.length === 0 && (
                            <div className="text-center py-8 text-[#6E7568]/40 text-xs italic">No at-risk clients - great job!</div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Retention Chart */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#6E7568]/10 shadow-sm">
                <h3 className="text-xs font-bold text-[#26150B] mb-6 uppercase tracking-wider border-b border-[#FBF7EF] pb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6E7568]"></span> Retention Distribution
                </h3>
                <div className="flex items-end justify-between h-40 gap-2 px-4">
                    {['0-20', '21-40', '41-60', '61-80', '81-100'].map((range, i) => {
                        const count = analytics.allClients.filter(c => {
                            const score = c.retentionScore;
                            if (i === 0) return score <= 20;
                            if (i === 4) return score > 80;
                            return score > (i * 20) && score <= ((i + 1) * 20);
                        }).length;
                        const maxCount = Math.max(...['0-20', '21-40', '41-60', '61-80', '81-100'].map((_, j) => {
                            return analytics.allClients.filter(c => {
                                const score = c.retentionScore;
                                if (j === 0) return score <= 20;
                                if (j === 4) return score > 80;
                                return score > (j * 20) && score <= ((j + 1) * 20);
                            }).length;
                        }), 1);
                        const height = Math.max(10, (count / maxCount) * 100);
                        
                        return (
                            <div key={range} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                                <span className="text-xs font-bold text-[#6E7568]">{count}</span>
                                <div className="w-full bg-[#FBF7EF] rounded-t-lg relative h-full flex items-end overflow-hidden shadow-inner flex-1">
                                    <div 
                                        className={`w-full rounded-t-lg transition-all duration-500 ${
                                            i < 2 ? 'bg-red-400' : i < 3 ? 'bg-yellow-400' : 'bg-green-400'
                                        }`}
                                        style={{ height: `${height}%` }}
                                    ></div>
                                </div>
                                <span className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider">{range}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
