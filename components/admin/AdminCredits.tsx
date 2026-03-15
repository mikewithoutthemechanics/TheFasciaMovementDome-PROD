import React, { useState } from 'react';
import { CREDIT_PACKAGES } from '../../constants';
import * as Icons from '../Icons';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6E7568] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6E7568] focus-visible:ring-offset-2";

export interface AdminCreditsProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonusCredits: number;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export const AdminCredits: React.FC<AdminCreditsProps> = ({ onShowToast }) => {
  const reducedMotion = useReducedMotion();
  const [packages, setPackages] = useState<CreditPackage[]>([...CREDIT_PACKAGES].sort((a, b) => a.sortOrder - b.sortOrder));
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [formData, setFormData] = useState<Partial<CreditPackage>>({
    name: '',
    credits: 1,
    price: 0,
    bonusCredits: 0,
    description: '',
    isActive: true,
    sortOrder: 1
  });

  const openCreateModal = () => {
    const maxSortOrder = packages.length > 0 ? Math.max(...packages.map(p => p.sortOrder)) : 0;
    setFormData({
      name: '',
      credits: 1,
      price: 0,
      bonusCredits: 0,
      description: '',
      isActive: true,
      sortOrder: maxSortOrder + 1
    });
    setEditingPackage(null);
    setModalMode('create');
  };

  const openEditModal = (pkg: CreditPackage) => {
    setFormData({ ...pkg });
    setEditingPackage(pkg);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingPackage(null);
    setFormData({
      name: '',
      credits: 1,
      price: 0,
      bonusCredits: 0,
      description: '',
      isActive: true,
      sortOrder: 1
    });
  };

  const handleSave = () => {
    // Form validation
    if (!formData.name?.trim()) {
      onShowToast('Please enter a package name', 'error');
      return;
    }
    if (!formData.credits || formData.credits < 1) {
      onShowToast('Credits must be at least 1', 'error');
      return;
    }
    if (formData.price === undefined || formData.price < 0) {
      onShowToast('Price cannot be negative', 'error');
      return;
    }
    if (formData.bonusCredits === undefined || formData.bonusCredits < 0) {
      onShowToast('Bonus credits cannot be negative', 'error');
      return;
    }

    if (modalMode === 'create') {
      const newPackage: CreditPackage = {
        id: `credits-${Date.now()}`,
        name: formData.name!,
        credits: formData.credits!,
        price: formData.price!,
        bonusCredits: formData.bonusCredits!,
        description: formData.description || '',
        isActive: formData.isActive ?? true,
        sortOrder: formData.sortOrder ?? packages.length + 1
      };
      setPackages(prev => [...prev, newPackage].sort((a, b) => a.sortOrder - b.sortOrder));
      onShowToast('Credit package created successfully!', 'success');
    } else if (modalMode === 'edit' && editingPackage) {
      setPackages(prev => prev.map(p => 
        p.id === editingPackage.id 
          ? { ...p, ...formData } as CreditPackage
          : p
      ).sort((a, b) => a.sortOrder - b.sortOrder));
      onShowToast('Credit package updated successfully!', 'success');
    }
    closeModal();
  };

  const toggleActive = (pkg: CreditPackage) => {
    setPackages(prev => prev.map(p => 
      p.id === pkg.id ? { ...p, isActive: !p.isActive } : p
    ));
    onShowToast(`Package "${pkg.name}" ${pkg.isActive ? 'deactivated' : 'activated'}`, 'info');
  };

  const handleDelete = (pkg: CreditPackage) => {
    if (window.confirm(`Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`)) {
      setPackages(prev => prev.filter(p => p.id !== pkg.id));
      onShowToast('Credit package deleted successfully', 'success');
    }
  };

  const formatPrice = (price: number) => {
    return `R ${price.toLocaleString('en-ZA')}`;
  };

  const getTotalCredits = (pkg: CreditPackage) => {
    return pkg.credits + pkg.bonusCredits;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#26150B] tracking-tight">Credit Packages</h1>
          <p className="text-sm text-[#6E7568] mt-1 font-medium">Manage credit packages for purchase</p>
        </div>
        <button 
          onClick={openCreateModal} 
          className="btn-primary rounded-full py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg flex-1 sm:flex-none justify-center hover:bg-[#5a6155] hover:-translate-y-0.5 transition-all"
        >
          <Icons.PlusIcon size={16}/> Add Package
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              layout
              initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={`bg-white rounded-[1.5rem] p-6 border shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5 premium-card-hover ${
                pkg.isActive ? 'border-[#6E7568]/10' : 'border-[#6E7568]/5 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  pkg.isActive ? 'bg-[#6E7568] text-[#FBF7EF]' : 'bg-[#6E7568]/20 text-[#6E7568]/50'
                }`}>
                  <Icons.CreditCardIcon size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(pkg)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${focusRing} ${
                      pkg.isActive 
                        ? 'bg-[#6E7568]/10 text-[#6E7568] border-[#6E7568]/20 hover:bg-[#6E7568]/20' 
                        : 'bg-[#26150B]/5 text-[#26150B]/50 border-[#26150B]/10 hover:bg-[#26150B]/10'
                    }`}
                  >
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Package Name */}
              <h3 className="text-[#26150B] font-bold text-lg mb-1 group-hover:text-[#6E7568] transition-colors">
                {pkg.name}
              </h3>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-extrabold text-[#26150B]">
                  {formatPrice(pkg.price)}
                </span>
              </div>

              {/* Credits Info */}
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-[#FBF7EF] px-3 py-2 rounded-xl border border-[#6E7568]/10">
                  <span className="text-sm font-bold text-[#6E7568]">
                    {pkg.credits} Credits
                  </span>
                </div>
                {pkg.bonusCredits > 0 && (
                  <div className="bg-[#6E7568]/10 px-3 py-2 rounded-xl border border-[#6E7568]/20">
                    <span className="text-sm font-bold text-[#6E7568]">
                      +{pkg.bonusCredits} Bonus
                    </span>
                  </div>
                )}
              </div>

              {/* Total Credits Badge */}
              <div className="flex items-center gap-2 mb-4">
                <Icons.ZapIcon size={14} className="text-[#6E7568]" />
                <span className="text-sm font-medium text-[#26150B]">
                  Total: <span className="font-bold">{getTotalCredits(pkg)}</span> credits
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-[#6E7568] leading-relaxed mb-4 min-h-[40px]">
                {pkg.description}
              </p>

              {/* Sort Order */}
              <div className="flex items-center gap-2 mb-4 text-xs text-[#6E7568]">
                <span className="bg-[#FBF7EF] px-2 py-1 rounded-md">
                  Order: {pkg.sortOrder}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-[#6E7568]/10">
                <button
                  onClick={() => openEditModal(pkg)}
                  className="flex-1 py-2.5 rounded-xl bg-[#FBF7EF] text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568] hover:text-[#FBF7EF] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.EditIcon size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(pkg)}
                  className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                  title="Delete package"
                >
                  <Icons.TrashIcon size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {packages.length === 0 && (
        <div className="text-center py-16 text-[#6E7568]/40 text-sm italic bg-[#FBF7EF]/30 rounded-[2rem] border-2 border-dashed border-[#6E7568]/10">
          <div className="w-16 h-16 bg-[#6E7568]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.CreditCardIcon size={28} />
          </div>
          <p className="text-[#6E7568] font-bold mb-2">No credit packages yet</p>
          <p className="text-xs mb-4">Create your first package to start selling credits</p>
          <button 
            onClick={openCreateModal}
            className="px-6 py-3 bg-[#6E7568] text-[#FBF7EF] rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            Create Package
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalMode && (
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={reducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FBF7EF] border border-[#6E7568]/20 rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-extrabold text-[#26150B] tracking-tight">
                  {modalMode === 'create' ? 'Create Package' : 'Edit Package'}
                </h2>
                <button 
                  onClick={closeModal} 
                  className="text-[#26150B]/40 hover:text-[#26150B] hover:bg-[#26150B]/5 rounded-full p-2 transition-all cursor-pointer"
                >
                  <Icons.XIcon />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-5">
                {/* Package Name */}
                <div>
                  <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                    Package Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 10-Class Pack"
                  />
                </div>

                {/* Credits & Price Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                      Credits
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                      value={formData.credits || ''}
                      onChange={e => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                      Price (R)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                      value={formData.price ?? ''}
                      onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 2800"
                    />
                  </div>
                </div>

                {/* Bonus Credits & Sort Order Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                      Bonus Credits
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                      value={formData.bonusCredits ?? ''}
                      onChange={e => setFormData({ ...formData, bonusCredits: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium"
                      value={formData.sortOrder || ''}
                      onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-[#6E7568] block mb-2 uppercase tracking-wider pl-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-4 rounded-2xl bg-white text-[#26150B] border border-[#6E7568]/10 focus:border-[#6E7568]/50 outline-none transition-all shadow-sm focus:shadow-md font-medium resize-none"
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Best value! Save R700 and get 2 bonus classes"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#6E7568]/10">
                  <div className="flex-1">
                    <label className="text-sm font-bold text-[#26150B] block">Active Status</label>
                    <p className="text-xs text-[#6E7568]">Make this package available for purchase</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${focusRing} ${
                      formData.isActive ? 'bg-[#6E7568]' : 'bg-[#6E7568]/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        formData.isActive ? 'left-8' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Summary Preview */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6E7568]/10 to-[#6E7568]/5 border border-[#6E7568]/20">
                  <p className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2">Preview</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#26150B]">{formData.name || 'Package Name'}</p>
                      <p className="text-xs text-[#6E7568]">
                        {formData.credits || 0} credits
                        {formData.bonusCredits ? ` + ${formData.bonusCredits} bonus` : ''}
                      </p>
                    </div>
                    <p className="text-xl font-extrabold text-[#26150B]">
                      {formatPrice(formData.price || 0)}
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSave}
                  className="w-full btn-primary py-4 rounded-2xl font-bold text-sm tracking-widest uppercase mt-6 shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-[#6E7568] to-[#5a6155] text-[#FBF7EF] hover:shadow-2xl cursor-pointer"
                >
                  {modalMode === 'create' ? 'Create Package' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCredits;
