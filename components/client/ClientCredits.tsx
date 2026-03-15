import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { User, CreditPackage } from '../../types';
import { CREDIT_PACKAGES } from '../../constants';
import { ZapIcon } from '../Icons';

// Props for the InsufficientCreditsModal
interface InsufficientCreditsModalProps {
  user: User;
  requiredCredits: number;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

// Props for the main ClientCredits component
interface ClientCreditsProps {
  user: User;
  requiredCredits: number;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

// Credit Package Card Component
interface CreditPackageCardProps {
  pkg: CreditPackage;
  isRecommended?: boolean;
  isPurchasing?: boolean;
  onPurchase: (pkg: CreditPackage) => void;
  disabled?: boolean;
}
const CreditPackageCard: React.FC<CreditPackageCardProps> = ({
  pkg,
  isRecommended = false,
  isPurchasing = false,
  onPurchase,
  disabled = false,
}) => {
  if (isRecommended) {
    return (
      <div className="relative">
        {/* Gradient Border */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6E7568]/60 via-[#C05640]/30 to-[#6E7568]/60 rounded-2xl blur-sm"></div>
        
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={disabled || isPurchasing}
          onClick={() => onPurchase(pkg)}
          className="relative w-full bg-[#6E7568] rounded-xl p-4 text-left hover:bg-[#5a6155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-bold text-[#FBF7EF]">{pkg.name}</h3>
              <p className="text-[10px] text-[#FBF7EF]/60">{pkg.description}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#FBF7EF]">R{pkg.price}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-[#FBF7EF]">{pkg.credits} credits</span>
            {pkg.bonusCredits && pkg.bonusCredits > 0 && (
              <span className="px-2 py-0.5 bg-[#FBF7EF]/20 text-[10px] font-bold text-[#FBF7EF] rounded-full">
                +{pkg.bonusCredits} bonus
              </span>
            )}
          </div>
          {isPurchasing && (
            <div className="mt-3 flex items-center justify-center gap-2 text-[#FBF7EF]">
              <div className="w-4 h-4 border-2 border-[#FBF7EF]/30 border-t-[#FBF7EF] rounded-full animate-spin" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative mb-3">
      {/* Gradient Border */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6E7568]/40 via-[#C05640]/20 to-[#6E7568]/40 rounded-xl blur-sm"></div>
      
      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled={disabled || isPurchasing}
        onClick={() => onPurchase(pkg)}
        className="relative w-full bg-white rounded-lg p-3 text-left hover:bg-[#FBF7EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-[#26150B]">{pkg.name}</h3>
            <p className="text-[9px] text-[#26150B]/50">{pkg.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[#6E7568]">R{pkg.price}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-bold text-[#26150B]">{pkg.credits} credits</span>
          {pkg.bonusCredits && pkg.bonusCredits > 0 && (
            <span className="px-1.5 py-0.5 bg-[#6E7568]/10 text-[8px] font-bold text-[#6E7568] rounded-full">
              +{pkg.bonusCredits} bonus
            </span>
          )}
        </div>
      </motion.button>
    </div>
  );
};

// Insufficient Credits Modal Component
const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  user,
  requiredCredits,
  onClose,
  onPurchaseComplete: _onPurchaseComplete,
}) => {
  const reducedMotion = useReducedMotion();
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  const userCredits = user.credits || 0;
  const creditsNeeded = requiredCredits - userCredits;

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasingPackage(pkg.id);
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          userId: user.id,
          email: user.email,
          name: user.name,
        }),
      });
      const data = await response.json();
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        alert('Failed to create payment link. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to create payment link. Please try again.');
    } finally {
      setPurchasingPackage(null);
    }
  };

  const suggestedPackage = CREDIT_PACKAGES
    .filter((p) => p.isActive && p.credits >= creditsNeeded)
    .sort((a, b) => a.credits - b.credits)[0];

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#26150B]/90 backdrop-blur-md z-[200] flex items-end justify-center pb-safe"
      onClick={onClose}
    >
      <motion.div
        initial={reducedMotion ? undefined : { y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-[#FBF7EF] rounded-t-[2.5rem] p-8 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-1 rounded-full bg-[#26150B]/10" />
        </div>

        <div className="w-16 h-16 rounded-full bg-[#C05640]/10 flex items-center justify-center mx-auto mb-6">
          <ZapIcon size={32} className="text-[#C05640]" />
        </div>

        <h2 className="text-2xl text-[#26150B] mb-2 font-bold tracking-tight text-center">
          Need More Credits
        </h2>
        <p className="text-xs text-[#26150B]/60 text-center mb-6">
          This class requires{' '}
          <span className="font-bold text-[#26150B]">
            {requiredCredits} credit{requiredCredits > 1 ? 's' : ''}
          </span>
          , but you only have{' '}
          <span className="font-bold text-[#26150B]">{userCredits}</span>.
        </p>

        <div className="bg-[#6E7568]/5 rounded-2xl p-4 mb-6 border border-[#6E7568]/10">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#26150B]/60 font-bold uppercase tracking-wider">
              Credits Needed
            </span>
            <span className="text-lg font-extrabold text-[#26150B]">+{creditsNeeded}</span>
          </div>
        </div>

        {suggestedPackage && (
          <div className="mb-6">
            <p className="text-[10px] font-bold text-[#6E7568] uppercase tracking-widest mb-3 text-center">
              Recommended Package
            </p>
            <CreditPackageCard
              pkg={suggestedPackage}
              isRecommended={true}
              isPurchasing={purchasingPackage === suggestedPackage.id}
              onPurchase={handlePurchase}
              disabled={purchasingPackage !== null}
            />
          </div>
        )}

        <div className="mb-6">
          <p className="text-[10px] font-bold text-[#26150B]/40 uppercase tracking-widest mb-3 text-center">
            Or Choose Another Package
          </p>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {CREDIT_PACKAGES.filter((p) => p.isActive)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((pkg: CreditPackage) => (
                <CreditPackageCard
                  key={pkg.id}
                  pkg={pkg}
                  isRecommended={false}
                  isPurchasing={purchasingPackage === pkg.id}
                  onPurchase={handlePurchase}
                  disabled={purchasingPackage !== null}
                />
              ))}
          </div>
        </div>

        <div className="bg-[#6E7568]/5 rounded-xl p-4 mb-6 border border-[#6E7568]/10">
          <p className="text-[10px] text-[#26150B]/60 text-center">
            After purchase, your credits will be added automatically. Return to this class and
            complete your booking.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-white border border-gray-200 text-[#26150B] rounded-full py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#FBF7EF] premium-hover"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
};

// Credit Packages Display Component (for browsing/purchasing credits)
interface CreditPackagesDisplayProps {
  onPurchase?: (pkg: CreditPackage) => void;
  purchasingPackageId?: string | null;
  disabled?: boolean;
}
const CreditPackagesDisplay: React.FC<CreditPackagesDisplayProps> = ({
  onPurchase,
  purchasingPackageId = null,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {CREDIT_PACKAGES.filter((p) => p.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((pkg: CreditPackage) => (
          <CreditPackageCard
            key={pkg.id}
            pkg={pkg}
            isRecommended={false}
            isPurchasing={purchasingPackageId === pkg.id}
            onPurchase={onPurchase || (() => {})}
            disabled={disabled || purchasingPackageId !== null}
          />
        ))}
    </div>
  );
};

// Main ClientCredits Component
export const ClientCredits: React.FC<ClientCreditsProps> = ({
  user,
  requiredCredits,
  isOpen,
  onClose,
  onPurchaseComplete: _onPurchaseComplete,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <InsufficientCreditsModal
          user={user}
          requiredCredits={requiredCredits}
          onClose={onClose}
          onPurchaseComplete={_onPurchaseComplete}
        />
      )}
    </AnimatePresence>
  );
};

// Export additional components for flexibility
export { InsufficientCreditsModal, CreditPackageCard, CreditPackagesDisplay };

export default ClientCredits;
