import React, { useState } from 'react';
import { Class } from '../../types';
import * as Icons from '../Icons';

interface Feedback {
    id: string;
    classId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

interface AdminFeedbackProps {
    classes: Class[];
}

export const AdminFeedback: React.FC<AdminFeedbackProps> = ({ classes }) => {
    const [selectedClass, setSelectedClass] = useState<string>('all');
    
    // Mock feedback data - replace with actual API call
    const [feedback] = useState<Feedback[]>([
        {
            id: '1',
            classId: classes[0]?.id || '1',
            userName: 'Jane Doe',
            rating: 5,
            comment: 'Amazing class! The instructor was very knowledgeable and helpful.',
            createdAt: new Date().toISOString()
        }
    ]);

    const filteredFeedback = selectedClass === 'all' 
        ? feedback 
        : feedback.filter(f => f.classId === selectedClass);

    const averageRating = feedback.length > 0 
        ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
        : '0';

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Feedback</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Student reviews and ratings</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-[#6E7568]/10 px-4 py-2 rounded-full">
                        <span className="text-2xl font-bold text-[#6E7568]">{averageRating}</span>
                        <span className="text-xs text-[#6E7568]/60 ml-1">avg rating</span>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <select 
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full sm:w-auto bg-white border border-[#6E7568]/10 text-[#26150B] font-medium rounded-full p-3 px-6 text-xs outline-none focus:border-[#6E7568]/50 shadow-sm hover:shadow-md transition-all appearance-none cursor-pointer"
                >
                    <option value="all">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>

            <div className="space-y-4">
                {filteredFeedback.map(item => {
                    const cls = classes.find(c => c.id === item.classId);
                    return (
                        <div key={item.id} className="bg-white p-5 rounded-[1.5rem] border border-[#6E7568]/10 shadow-sm">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#6E7568]/10 flex items-center justify-center text-[#6E7568] font-bold text-sm">
                                        {item.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-[#26150B] font-bold text-sm">{item.userName}</h4>
                                        <p className="text-[10px] text-[#6E7568]">{cls?.title || 'Unknown Class'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Icons.StarIcon 
                                            key={i} 
                                            size={14} 
                                            className={i < item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} 
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-[#26150B]/80 leading-relaxed">{item.comment}</p>
                            <p className="text-[10px] text-[#6E7568]/60 mt-3">
                                {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    );
                })}
                {filteredFeedback.length === 0 && (
                    <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
                        No feedback yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFeedback;
