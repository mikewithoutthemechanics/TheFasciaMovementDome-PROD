import React, { useState } from 'react';
import { Class, Registration, WaiverData } from '../../types';
import * as Icons from '../Icons';
import { db } from '../../services/db-supabase';
import { EmptyState } from '../ui/EmptyState';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

interface AdminUsersProps {
    classes: Class[];
    registrations: Registration[];
    onVerifyPayment: (id: string, verified: boolean) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ classes, registrations, onVerifyPayment }) => {
    const [filterClass, setFilterClass] = useState("all");
    const [viewWaiver, setViewWaiver] = useState<WaiverData | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const filtered = filterClass === "all" ? registrations : registrations.filter(r => r.classId === filterClass);

    const handleViewWaiver = async (userId: string) => {
        // Fetch fresh user data from DB to get waiver details
        const user = await db.getUser(userId);
        if (user && user.waiverData) {
            setViewWaiver(user.waiverData);
        } else if (user && user.waiverAccepted) {
            // Legacy fall back
            setViewWaiver({
                signed: true,
                signedAt: new Date().toISOString(), // Approximate or store actual date in older models
                signerName: user.name,
                agreements: { medical: true, heat: true, liability: true }
            });
        } else {
            alert("No waiver found for this user.");
        }
    };

    return (
        <div className="animate-fade-in relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Users</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Verification & Lists</p>
                </div>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className={`w-full sm:w-auto bg-white border border-[#6E7568]/10 text-[#26150B] font-medium rounded-full p-3 px-6 text-xs outline-none focus:border-[#6E7568]/50 shadow-sm hover:shadow-md transition-all appearance-none cursor-pointer ${focusRing}`}>
                    <option value="all" className="bg-white">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id} className="bg-white">{c.title}</option>)}
                </select>
            </div>

            <div className="space-y-4">
                {filtered.map(r => {
                    const cls = classes.find(c => c.id === r.classId);
                    return (
                        <div key={r.id} className="bg-white p-5 rounded-[1.5rem] border border-[#6E7568]/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#FBF7EF] flex items-center justify-center text-[#6E7568] font-bold text-sm shadow-inner border border-[#6E7568]/5">
                                        {r.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-[#26150B] font-bold text-sm flex items-center gap-2">
                                            {r.userName}
                                            <button onClick={() => handleViewWaiver(r.userId)} title="View Signed Waiver" className={`text-[10px] cursor-pointer hover:bg-[#6E7568]/10 rounded-full p-1 transition-colors text-[#6E7568] ${focusRing}`}>
                                                <Icons.ArticleIcon size={12} />
                                            </button>
                                        </h4>
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
                                    {r.paymentProof && (
                                        <a href={r.paymentProof} download={`proof-${r.id}.png`} className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-[#6E7568]/10 text-[#6E7568] bg-[#FBF7EF] hover:bg-[#6E7568] hover:text-[#FBF7EF] transition-colors flex items-center gap-1 shadow-sm cursor-pointer ${focusRing}`}>
                                            <Icons.ArticleIcon size={10} /> View Proof
                                        </a>
                                    )}
                                </div>
                                {r.notes && (
                                    <div className="mt-3 bg-[#FBF7EF]/50 p-3 rounded-xl border border-[#6E7568]/5">
                                        <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1 flex items-center gap-1"><Icons.InfoIcon size={10}/> Notes / Injuries</p>
                                        <p className="text-[10px] text-[#26150B] italic leading-relaxed">{r.notes}</p>
                                    </div>
                                )}
                            </div>
                            
                            {r.status === 'payment_review' && (
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button 
                                        onClick={() => {
                                            setVerifyingId(r.id);
                                            onVerifyPayment(r.id, true);
                                            setVerifyingId(null);
                                        }} 
                                        disabled={verifyingId !== null}
                                        className={`flex-1 sm:flex-none bg-[#6E7568]/10 text-[#6E7568] hover:bg-[#6E7568] hover:text-[#FBF7EF] border border-[#6E7568]/20 text-[10px] font-bold uppercase px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${focusRing}`}
                                    >
                                        {verifyingId === r.id ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                                        ) : (
                                            <>
                                                <Icons.CheckIcon size={14} /> Verify
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setVerifyingId(r.id);
                                            onVerifyPayment(r.id, false);
                                            setVerifyingId(null);
                                        }}
                                        disabled={verifyingId !== null}
                                        className={`flex-1 sm:flex-none bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/10 text-[10px] font-bold uppercase px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${focusRing}`}
                                    >
                                        {verifyingId === r.id ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
                                        ) : (
                                            <>
                                                <Icons.XIcon size={14} /> Reject
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <EmptyState
                        title="No Users Yet"
                        description="Users will appear here once they register for classes."
                        icon="users"
                    />
                )}
            </div>

            {/* WAIVER MODAL */}
            {viewWaiver && (
                <div className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#FBF7EF] rounded-[2rem] p-8 max-w-sm w-full border border-[#6E7568]/20 shadow-2xl relative">
                        <button onClick={() => setViewWaiver(null)} className={`absolute top-5 right-5 text-[#26150B]/40 hover:text-[#26150B] transition-colors cursor-pointer ${focusRing}`}><Icons.XIcon /></button>
                        
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-[#6E7568]/10 flex items-center justify-center mx-auto mb-4 text-[#6E7568] shadow-inner border border-[#6E7568]/5">
                                <Icons.ArticleIcon size={32} />
                            </div>
                            <h2 className="text-xl font-extrabold text-[#26150B] tracking-tight">Digital Waiver</h2>
                        </div>

                        <div className="space-y-5 bg-white p-6 rounded-2xl border border-gray-200 mb-6 shadow-sm">
                            <div>
                                <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Signed By</p>
                                <p className="text-base font-['Courier_New'] font-bold text-[#26150B] border-b border-[#26150B]/10 pb-1">{viewWaiver.signerName}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-1">Date Signed</p>
                                <p className="text-sm text-[#26150B] font-medium">{new Date(viewWaiver.signedAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Agreements</p>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(viewWaiver.agreements).map(([key, accepted]) => (
                                        accepted && <span key={key} className="px-3 py-1 bg-[#6E7568]/10 text-[#6E7568] rounded-lg text-[9px] uppercase font-bold border border-[#6E7568]/10 flex items-center gap-1"><Icons.CheckIcon size={10} /> {key}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-[10px] text-[#26150B]/40 italic font-medium">Digitally signed via Pause App</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
