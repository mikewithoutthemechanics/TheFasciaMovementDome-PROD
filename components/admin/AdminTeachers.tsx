import React, { useState } from 'react';
import { Teacher } from '../../types';
import * as Icons from '../Icons';
import EmptyState from '../ui/EmptyState';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

interface AdminTeachersProps {
    teachers: Teacher[];
    onAddTeacher: (teacher: Teacher) => void;
    onEditTeacher: (teacher: Teacher) => void;
    onDeleteTeacher: (id: string) => void;
    onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminTeachers: React.FC<AdminTeachersProps> = ({ 
    teachers, 
    onAddTeacher, 
    onEditTeacher, 
    onDeleteTeacher,
    onShowToast 
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Teacher>>({
        name: '',
        email: '',
        phone: '',
        bio: '',
        specialties: [],
        active: true
    });
    const [specialtyInput, setSpecialtyInput] = useState('');

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            bio: '',
            specialties: [],
            active: true
        });
        setSpecialtyInput('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            onShowToast?.('Name and email are required', 'error');
            return;
        }
        setIsSaving(true);

        if (editingId) {
            onEditTeacher({
                ...formData,
                id: editingId,
                specialties: formData.specialties || [],
                active: formData.active ?? true
            } as Teacher);
            onShowToast?.('Teacher updated successfully', 'success');
            setEditingId(null);
        } else {
            onAddTeacher({
                ...formData,
                id: crypto.randomUUID(),
                specialties: formData.specialties || [],
                active: formData.active ?? true
            } as Teacher);
            onShowToast?.('Teacher added successfully', 'success');
            setIsAdding(false);
        }
        resetForm();
        setIsSaving(false);
    };

    const handleEdit = (teacher: Teacher) => {
        setFormData({
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            bio: teacher.bio,
            specialties: teacher.specialties,
            active: teacher.active
        });
        setEditingId(teacher.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        resetForm();
    };

    const addSpecialty = () => {
        if (specialtyInput.trim() && !formData.specialties?.includes(specialtyInput.trim())) {
            setFormData({
                ...formData,
                specialties: [...(formData.specialties || []), specialtyInput.trim()]
            });
            setSpecialtyInput('');
        }
    };

    const removeSpecialty = (spec: string) => {
        setFormData({
            ...formData,
            specialties: formData.specialties?.filter(s => s !== spec) || []
        });
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Teachers</h1>
                    <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage instructor profiles</p>
                </div>
                {!isAdding && (
<button 
                        onClick={() => setIsAdding(true)}
                        className={`w-full sm:w-auto bg-[#6E7568] text-[#FBF7EF] hover:bg-[#6E7568]/90 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer ${focusRing}`}
                    >
                        <Icons.PlusIcon size={16} /> Add Teacher
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-[1.5rem] border border-[#6E7568]/10 shadow-lg mb-8">
                    <h3 className="text-lg font-bold text-[#26150B] mb-4">
                        {editingId ? 'Edit Teacher' : 'Add New Teacher'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Name *</label>
                                <input 
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50"
                                    placeholder="Enter name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Email *</label>
                                <input 
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50"
                                    placeholder="Enter email"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Phone</label>
                            <input 
                                type="tel"
                                value={formData.phone || ''}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50"
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Bio</label>
                            <textarea 
                                value={formData.bio || ''}
                                onChange={e => setFormData({...formData, bio: e.target.value})}
                                className="w-full bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50 min-h-[100px] resize-none"
                                placeholder="Enter teacher bio"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[#6E7568] uppercase tracking-wider mb-2">Specialties</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text"
                                    value={specialtyInput}
                                    onChange={e => setSpecialtyInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                                    className="flex-1 bg-[#FBF7EF] border border-[#6E7568]/10 text-[#26150B] rounded-xl p-3 text-sm outline-none focus:border-[#6E7568]/50"
                                    placeholder="Add a specialty (e.g., Yoga, Pilates)"
                                />
<button 
                                    type="button"
                                    onClick={addSpecialty}
                                    className={`bg-[#6E7568]/10 text-[#6E7568] hover:bg-[#6E7568] hover:text-[#FBF7EF] px-4 py-2 rounded-xl transition-colors cursor-pointer ${focusRing}`}
                                >
                                    <Icons.PlusIcon size={16} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.specialties?.map(spec => (
                                    <span key={spec} className="px-3 py-1 bg-[#6E7568]/10 text-[#6E7568] rounded-full text-xs font-medium flex items-center gap-1">
                                        {spec}
                                        <button type="button" onClick={() => removeSpecialty(spec)} className={`hover:text-red-500 cursor-pointer ${focusRing}`}>
                                            <Icons.XIcon size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={e => setFormData({...formData, active: e.target.checked})}
                                className="w-4 h-4 rounded border-[#6E7568]/30 text-[#6E7568] focus:ring-[#6E7568]"
                            />
                            <label htmlFor="active" className="text-sm text-[#26150B]">Active</label>
                        </div>
<div className="flex gap-3 pt-4">
                            <button 
                                type="submit"
                                disabled={isSaving}
                                className={`flex-1 bg-[#6E7568] text-[#FBF7EF] hover:bg-[#6E7568]/90 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${focusRing}`}
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-[#FBF7EF]/30 border-t-[#FBF7EF] rounded-full animate-spin" />
                                ) : editingId ? 'Update Teacher' : 'Add Teacher'}
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
                {teachers.map(teacher => (
                    <div key={teacher.id} className="bg-white p-5 rounded-[1.5rem] border border-[#6E7568]/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#6E7568]/10 flex items-center justify-center text-[#6E7568] font-bold text-lg">
                                {teacher.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-[#26150B] font-bold text-sm">{teacher.name}</h4>
                                <p className="text-[10px] text-[#6E7568]">{teacher.email}</p>
                                {teacher.phone && <p className="text-[10px] text-[#6E7568]">{teacher.phone}</p>}
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {teacher.specialties?.map(spec => (
                                        <span key={spec} className="px-2 py-0.5 bg-[#6E7568]/10 text-[#6E7568] rounded-full text-[9px] font-medium">
                                            {spec}
                                        </span>
                                    ))}
                                    {teacher.specialties?.length === 0 && (
                                        <span className="text-[9px] text-[#6E7568]/50 italic">No specialties</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${teacher.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {teacher.active ? 'Active' : 'Inactive'}
                            </span>
<button 
                                onClick={() => handleEdit(teacher)}
                                className={`p-2 text-[#6E7568] hover:bg-[#6E7568]/10 rounded-lg transition-colors cursor-pointer ${focusRing}`}
                                title="Edit"
                            >
                                <Icons.EditIcon size={16} />
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm(`Delete ${teacher.name}?`)) {
                                        setIsDeleting(teacher.id);
                                        onDeleteTeacher(teacher.id);
                                        onShowToast?.('Teacher deleted', 'success');
                                        setIsDeleting(null);
                                    }
                                }}
                                disabled={isDeleting !== null}
                                className={`p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${focusRing}`}
                                title="Delete"
                            >
                                {isDeleting === teacher.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                                ) : (
                                    <Icons.TrashIcon size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
                {teachers.length === 0 && (
                    <EmptyState 
                        title="No teachers yet"
                        description="Add your first teacher to start scheduling classes."
                        actionLabel="Add Teacher"
                        onAction={() => setIsAdding(true)}
                        icon={<Icons.PersonIcon size={48} />}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminTeachers;
