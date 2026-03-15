import React, { useState } from 'react';
import { Venue } from '../../types';
import * as Icons from '../Icons';
import EmptyState from '../ui/EmptyState';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

interface AdminVenuesProps {
    venues: Venue[];
    onAddVenue: (venue: Venue) => void;
    onEditVenue: (venue: Venue) => void;
    onDeleteVenue: (id: string) => void;
}

export const AdminVenues: React.FC<AdminVenuesProps> = ({ 
    venues, 
    onAddVenue, 
    onEditVenue, 
    onDeleteVenue 
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Venue>>({
        name: '',
        address: '',
        capacity: 20
    });

    const resetForm = () => {
        setFormData({ name: '', address: '', capacity: 20 });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        setIsSaving(true);

        if (editingId) {
            onEditVenue({ ...formData, id: editingId } as Venue);
            setEditingId(null);
        } else {
            onAddVenue({ ...formData, id: crypto.randomUUID() } as Venue);
            setIsAdding(false);
        }
        resetForm();
        setIsSaving(false);
    };

    const handleEdit = (venue: Venue) => {
        setFormData({
            name: venue.name,
            address: venue.address,
            capacity: venue.capacity
        });
        setEditingId(venue.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        resetForm();
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Venues</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage class locations</p>
                </div>
                {!isAdding && (
<button 
                        onClick={() => setIsAdding(true)}
                        className={`w-full sm:w-auto bg-[#6E7568] text-[#FBF7EF] hover:bg-[#6E7568]/90 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer ${focusRing}`}
                    >
                        <Icons.PlusIcon size={16} /> Add Venue
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-[1.5rem] border border-[#6E7568]/10 shadow-lg mb-8">
                    <h3 className="text-lg font-bold text-[#26150B] mb-4">
                        {editingId ? 'Edit Venue' : 'Add New Venue'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Name *</label>
                            <input 
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50"
                                placeholder="Enter venue name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Address</label>
                            <textarea 
                                value={formData.address || ''}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                                className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50 min-h-[80px] resize-none"
                                placeholder="Enter address"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Capacity</label>
                            <input 
                                type="number"
                                value={formData.capacity}
                                onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 20})}
                                className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50"
                                min="1"
                            />
                        </div>
<div className="flex gap-3 pt-4">
                            <button 
                                type="submit"
                                disabled={isSaving}
                                className={`flex-1 bg-[#6E7568] text-[#FBF7EF] hover:bg-[#6E7568]/90 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${focusRing}`}
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-[#FBF7EF]/30 border-t-[#FBF7EF] rounded-full animate-spin" />
                                ) : editingId ? 'Update Venue' : 'Add Venue'}
                            </button>
                            <button 
                                type="button"
                                onClick={handleCancel}
                                className={`flex-1 bg-[#FBF7EF] text-[#26150B] hover:bg-[#26150B]/5 border border-[#6E7568]/10 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${focusRing}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {venues.map(venue => (
                    <div key={venue.id} className="bg-white p-5 rounded-[1.5rem] border border-[#6E7568]/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#6E7568]/10 flex items-center justify-center text-[#6E7568]">
                                <Icons.LocationIcon size={20} />
                            </div>
                            <div>
                                <h4 className="text-[#26150B] font-bold text-sm">{venue.name}</h4>
                                {venue.address && <p className="text-[10px] text-[#6E7568]">{venue.address}</p>}
                                <p className="text-[10px] text-[#6E7568]">Capacity: {venue.capacity}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleEdit(venue)}
                                className={`p-2 text-[#6E7568] hover:bg-[#6E7568]/10 rounded-lg transition-colors cursor-pointer ${focusRing}`}
                                title="Edit"
                            >
                                <Icons.EditIcon size={16} />
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm(`Delete ${venue.name}?`)) {
                                        setIsDeleting(venue.id);
                                        onDeleteVenue(venue.id);
                                        setIsDeleting(null);
                                    }
                                }}
                                disabled={isDeleting !== null}
                                className={`p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${focusRing}`}
                                title="Delete"
                            >
                                {isDeleting === venue.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                                ) : (
                                    <Icons.TrashIcon size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
                {venues.length === 0 && (
                    <EmptyState 
                        title="No venues yet"
                        description="Add your first venue to start scheduling classes."
                        actionLabel="Add Venue"
                        onAction={() => setIsAdding(true)}
                        icon={<Icons.LocationIcon size={48} />}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminVenues;
