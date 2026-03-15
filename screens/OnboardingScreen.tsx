
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { PauseLogo } from '../components/PauseLogo';
import { CheckIcon, ChevronRightIcon, InfoIcon, ArrowLeftIcon, GiftIcon, CreditCardIcon, XIcon } from '../components/Icons';
import { BodyHeatMap } from '../components/BodyHeatMap';
import { WaiverData, InjuryRecord, Disclaimer } from '../types';
import { CREDIT_PACKAGES } from '../constants';

interface OnboardingScreenProps {
  userName: string;
  userEmail: string;
  userId: string;
  disclaimers?: Disclaimer[];
  onComplete: (waiverData: WaiverData, injuries: InjuryRecord[], skipCreditPurchase?: boolean) => void;
  onSkipCreditPurchase?: () => void;
}

const CREDIT_PRICE_PER_UNIT = 150;
const PAYMENTS_ENABLED = false; // Disable payment buttons - credits = R150 each

const SectionHeader = ({ id, title, isComplete, expanded, toggleSection }: { id: string, title: string, isComplete?: boolean, expanded: string | null, toggleSection: (id: string) => void }) => (
    <button 
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-white border-b border-[#26150B]/5 hover:bg-[#26150B]/5 transition-colors"
    >
        <span className="font-bold text-[#26150B] text-sm flex items-center gap-2">
            {isComplete && <CheckIcon size={14} className="text-[#6E7568]" />}
            {title}
        </span>
        <motion.div 
            animate={{ rotate: expanded === id ? 90 : 0 }}
            transition={{ duration: 0.2 }}
        >
            <ChevronRightIcon size={16} className="text-[#26150B]/40" />
        </motion.div>
    </button>
);


export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ userName, userEmail, userId, disclaimers, onComplete, onSkipCreditPurchase: _onSkipCreditPurchase }) => {
  // Get waiver disclaimer - either from props (dynamic) or use defaults
  const waiverDisclaimer = disclaimers?.find(d => d.context === 'waiver' && d.active);
  
  // Use dynamic sections if available, otherwise fall back to defaults
  const defaultSections = [
    { id: 'medical', title: '1. Medical Clearance', content: 'I confirm that I am medically fit to participate in physical exercise. I undertake to disclose any relevant medical conditions, chronic medication, injuries, or surgeries to the teacher prior to any session. Warning: Consult a physician if you have high blood pressure, heart conditions, or are pregnant before entering the heated environment.', order: 1, required: true },
    { id: 'heat', title: '2. Heat & Environment', content: 'The Dome involves heat and movement. Risks include dehydration, dizziness, and heat exhaustion. I agree to hydrate adequately and exit immediately if I feel unwell.', order: 2, required: true },
    { id: 'liability', title: '3. Indemnity & Waiver', content: 'I voluntarily assume all risks associated with participation at "Pause — The Fascia Movement Dome". I indemnify Pause Fascia Movement (Pty) Ltd against claims arising from injury or theft, except where due to gross negligence. This waiver is binding on my heirs and executors.', order: 3, required: true }
  ];
  
  const disclaimerSections = waiverDisclaimer?.sections || defaultSections;
  const introText = waiverDisclaimer?.introText || 'Welcome to The Fascia Movement Dome. Because we work with heat (38°C) and movement, we need to ensure you understand the safety protocols.';
  
  // State for expanded sections
  const [expanded, setExpanded] = useState<string | null>('intro');
  const [signature, setSignature] = useState('');
  
  // Step tracking: 'waiver' -> 'injuries' -> 'credits' -> complete
  const [step, setStep] = useState<'waiver' | 'injuries' | 'credits'>('waiver');
  
  // Credit purchase state
  const [customCredits, setCustomCredits] = useState<number>(1);
  const [purchasingCustom, setPurchasingCustom] = useState(false);
  const [creditPurchaseLoading, setCreditPurchaseLoading] = useState(false);
  
  // Injury state
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  // Coccyx injury state
  const [hasCoccyxInjury, setHasCoccyxInjury] = useState(false);
  // No injuries confirmation state
  const [noInjuriesConfirmed, setNoInjuriesConfirmed] = useState(false);
  
  // Client IP state for waiver
  const [clientIp, setClientIp] = useState<string>('');
  
  // Fetch client IP on mount
  useEffect(() => {
    const fetchClientIp = async () => {
      try {
        const response = await fetch('/api/client-ip');
        const data = await response.json();
        setClientIp(data.ip || 'unknown');
      } catch (error) {
        console.warn('Failed to fetch client IP:', error);
        setClientIp('unknown');
      }
    };
    fetchClientIp();
  }, []);
  
  // Toggle accordion
  const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

  const completeOnboarding = (skipCreditPurchase?: boolean) => {
    const waiverData: WaiverData = {
      signed: true,
      signedAt: new Date().toISOString(),
      signerName: signature,
      agreements: {
        medical: true,
        heat: true,
        liability: true
      },
      userAgent: navigator.userAgent,
      ipAddress: clientIp || 'unknown'
    };
    onComplete(waiverData, injuries, skipCreditPurchase);
  };

  const handlePackagePurchase = async (packageId: string) => {
    setPurchasingPackage(packageId);
    setCreditPurchaseLoading(true);
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          userId,
          email: userEmail
        })
      });
      const data = await response.json();
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        alert('Failed to create payment link. Please try again.');
      }
    } catch (error) {
      console.error('Error purchasing package:', error);
      alert('Failed to create payment link. Please try again.');
    } finally {
      setPurchasingPackage(null);
      setCreditPurchaseLoading(false);
    }
  };

  const handleCustomCreditPurchase = async () => {
    setPurchasingCustom(true);
    setCreditPurchaseLoading(true);
    try {
      const response = await fetch('/api/credits/custom-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: customCredits,
          userId,
          email: userEmail
        })
      });
      const data = await response.json();
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        alert('Failed to create payment link. Please try again.');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      alert('Failed to create payment link. Please try again.');
    } finally {
      setPurchasingCustom(false);
      setCreditPurchaseLoading(false);
    }
  };

  const handleGoBack = () => {
    if (step === 'credits') {
      setStep('injuries');
    } else if (step === 'injuries') {
      setStep('waiver');
    }
  };

  const handleSignAndAccept = () => {
    if (signature.length < 3) return;
    setStep('injuries');
  };

  const handleInjuriesContinue = () => {

    setStep('credits');
  };

  // CREDITS STEP
  if (step === 'credits') {
    return (
      <div className="min-h-screen bg-[#FBF7EF] flex flex-col items-center p-4 sm:p-6 font-['Montserrat'] overflow-y-auto">
        {/* Header with Back Arrow */}
        <div className="w-full max-w-lg mb-6 pt-4 flex items-center justify-center text-center relative">
          <button 
            onClick={handleGoBack}
            className="absolute left-0 p-2 rounded-full hover:bg-[#26150B]/5 transition-colors cursor-pointer"
          >
            <ArrowLeftIcon size={24} className="text-[#26150B]" />
          </button>
          <div className="flex flex-col items-center">
            <GiftIcon size={48} className="text-[#763417]" />
            <h1 className="text-xl font-bold text-[#26150B] mt-4">Get Credits</h1>
            <p className="text-xs text-[#26150B]/60 mt-1">Purchase credits to book your first class</p>
          </div>
        </div>

        {/* Credit Packages - Payments Disabled */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-3 mb-6"
        >
          {!PAYMENTS_ENABLED && (
            <div className="w-full p-4 bg-[#6E7568]/10 rounded-xl border-2 border-[#6E7568]/30 text-center mb-4">
              <p className="font-bold text-[#26150B]">Credit Purchase Temporarily Unavailable</p>
              <p className="text-xs text-[#26150B]/60 mt-1">Please contact us to purchase credits</p>
            </div>
          )}
          {CREDIT_PACKAGES.filter(p => p.isActive).map((pkg) => (
            <div
              key={pkg.id}
              className="w-full p-4 bg-white/50 rounded-xl border-2 border-[#6E7568]/20 text-left opacity-60"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#26150B]">{pkg.name}</p>
                  <p className="text-xs text-[#26150B]/60">{pkg.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#763417] text-lg">R{pkg.price}</p>
                  <p className="text-xs text-[#6E7568]">{pkg.credits + (pkg.bonusCredits || 0)} credits</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Custom Credit Purchase - Disabled */}
        {PAYMENTS_ENABLED && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-lg bg-white rounded-xl border-2 border-[#6E7568]/20 p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <CreditCardIcon size={20} className="text-[#6E7568]" />
            <p className="font-bold text-[#26150B]">Custom Amount</p>
          </div>
          <p className="text-xs text-[#26150B]/60 mb-2">Choose how many credits you'd like to purchase (1-10)</p>
          <p className="text-[10px] text-[#26150B]/50 mb-4">Secure payment via PayFast. Apple Pay and Google Pay available when enabled.</p>
          
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => setCustomCredits(Math.max(1, customCredits - 1))}
              className="w-10 h-10 rounded-full bg-[#FBF7EF] text-[#26150B] font-bold text-xl hover:bg-[#26150B]/10 transition-colors"
            >
              -
            </button>
            <div className="flex-1 text-center">
              <p className="text-3xl font-bold text-[#26150B]">{customCredits}</p>
              <p className="text-xs text-[#26150B]/60">credits</p>
            </div>
            <button 
              onClick={() => setCustomCredits(Math.min(10, customCredits + 1))}
              className="w-10 h-10 rounded-full bg-[#FBF7EF] text-[#26150B] font-bold text-xl hover:bg-[#26150B]/10 transition-colors"
            >
              +
            </button>
          </div>
          
          <div className="flex justify-between items-center mb-4 p-3 bg-[#FBF7EF] rounded-lg">
            <span className="text-sm text-[#26150B]">Total:</span>
            <span className="text-xl font-bold text-[#763417]">R{customCredits * CREDIT_PRICE_PER_UNIT}</span>
          </div>
          
          <button 
            onClick={handleCustomCreditPurchase}
            disabled={purchasingCustom || creditPurchaseLoading}
            className="w-full py-3 bg-[#763417] text-white rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[#5a2a12] transition-colors disabled:opacity-50"
          >
            {purchasingCustom || creditPurchaseLoading ? 'Processing...' : 'Buy Credits'}
          </button>
        </motion.div>
        )}

        {/* Skip Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-lg"
        >
          <button 
            onClick={() => completeOnboarding(true)}
            className="w-full py-3 rounded-full bg-white text-[#6E7568] text-xs font-bold uppercase tracking-widest border border-[#6E7568]/10 hover:border-[#6E7568]/30 transition-colors cursor-pointer"
          >
            Skip for Now
          </button>
        </motion.div>

        {/* Progress indicator */}
        <div className="flex gap-2 mt-8">
          <div className="w-8 h-1 rounded-full bg-[#6E7568]"></div>
          <div className="w-8 h-1 rounded-full bg-[#6E7568]"></div>
          <div className="w-8 h-1 rounded-full bg-[#763417]"></div>
        </div>
      </div>
    );
  }

  // WAIVER STEP
  if (step === 'waiver') {
    return (
      <div className="min-h-screen bg-[#FBF7EF] flex flex-col items-center p-4 sm:p-6 font-['Montserrat']">
        
        {/* Header */}
        <div className="w-full max-w-lg mb-6 pt-4 flex flex-col items-center text-center">
          <PauseLogo size="sm" light={false} />
          <h1 className="text-xl font-bold text-[#26150B] mt-4">Safety & Liability Waiver</h1>
          <p className="text-xs text-[#26150B]/60 mt-1">Please review and sign below to enter the Dome.</p>
        </div>

        {/* Main Contract Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-xl shadow-[#26150B]/5 overflow-hidden border border-[#26150B]/5 flex flex-col"
        >
          {/* Intro Section */}
          <div className="p-6 bg-[#FBF7EF]/30 border-b border-[#26150B]/5">
              <p className="text-xs text-[#26150B]/80 leading-relaxed">
                  Welcome, <span className="font-bold">{userName}</span>. <br/>
                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(introText.replace(/\n/g, '<br/>')) }} />
              </p>
          </div>

          {/* Section 1: Medical */}
          {disclaimerSections[0] && (
            <>
              <SectionHeader id="medical" title={disclaimerSections[0].title} isComplete={true} expanded={expanded} toggleSection={toggleSection} />
              <AnimatePresence>
                  {expanded === 'medical' && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#FBF7EF]/10"
                      >
                          <div className="p-6 text-xs text-[#26150B]/70 leading-relaxed space-y-3">
                              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(disclaimerSections[0].content.replace(/\n/g, '<br/>')) }} />
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </>
          )}

          {/* Section 2: Heat */}
          {disclaimerSections[1] && (
            <>
              <SectionHeader id="heat" title={disclaimerSections[1].title} isComplete={true} expanded={expanded} toggleSection={toggleSection} />
              <AnimatePresence>
                  {expanded === 'heat' && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#FBF7EF]/10"
                      >
                          <div className="p-6 text-xs text-[#26150B]/70 leading-relaxed space-y-3">
                              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(disclaimerSections[1].content.replace(/\n/g, '<br/>')) }} />
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </>
          )}

          {/* Section 3: Liability */}
          {disclaimerSections[2] && (
            <>
              <SectionHeader id="liability" title={disclaimerSections[2].title} isComplete={true} expanded={expanded} toggleSection={toggleSection} />
              <AnimatePresence>
                  {expanded === 'liability' && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#FBF7EF]/10"
                      >
                          <div className="p-6 text-xs text-[#26150B]/70 leading-relaxed space-y-3">
                              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(disclaimerSections[2].content.replace(/\n/g, '<br/>')) }} />
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </>
          )}

          {/* Signature Area */}
          <div className="p-6 bg-[#6E7568] mt-auto">
              <label className="block text-[10px] font-bold text-[#FBF7EF] uppercase tracking-widest mb-2">
                  Digital Signature
              </label>
              <input 
                  type="text" 
                  placeholder="Type your full name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full bg-[#FBF7EF] text-[#26150B] rounded-xl p-4 text-sm font-bold placeholder-[#26150B]/30 outline-none border-2 border-transparent focus:border-[#FBF7EF]/50 mb-4 font-['Courier_New']"
              />
              
              <p className="text-[9px] text-[#FBF7EF]/60 mb-4 leading-tight">
                  By typing your name above and clicking "Accept", you acknowledge that you have read and understood the terms of this waiver and agree to be bound by them.
              </p>

              <button 
                  onClick={handleSignAndAccept}
                  disabled={signature.length < 3}
                  className="w-full btn-primary rounded-full py-4 text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                  Accept & Continue
              </button>
          </div>

        </motion.div>
        
        <p className="mt-6 text-[9px] text-[#26150B]/30 font-bold uppercase tracking-widest">
          Pause Fascia Movement &copy; {new Date().getFullYear()}
        </p>

      </div>
    );
  }

  if (step === 'injuries') {
    return (
      <div className="min-h-screen bg-[#FBF7EF] flex flex-col items-center p-4 sm:p-6 font-['Montserrat'] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        
        {/* Header with Back Arrow */}
        <div className="w-full max-w-lg mb-6 pt-4 flex items-center justify-center text-center relative">
          <button 
            onClick={handleGoBack}
            className="absolute left-0 p-2 rounded-full hover:bg-[#26150B]/5 transition-colors cursor-pointer"
          >
            <ArrowLeftIcon size={24} className="text-[#26150B]" />
          </button>
          <div className="flex flex-col items-center">
            <PauseLogo size="sm" light={false} />
            <h1 className="text-xl font-bold text-[#26150B] mt-4">Injuries</h1>
            <p className="text-xs text-[#26150B]/60 mt-1">Help us understand your body better</p>
          </div>
        </div>

        {/* Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-xl shadow-[#26150B]/5 overflow-hidden border border-[#26150B]/5 mb-6"
        >
          <div className="p-6 bg-[#FBF7EF]/30 border-b border-[#26150B]/5">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-[#6E7568]/10 flex items-center justify-center flex-shrink-0">
                <InfoIcon size={20} className="text-[#6E7568]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#26150B]">Why we ask this</p>
                <p className="text-xs text-[#26150B]/70 mt-1">
                  Your teacher will use this information to provide modifications and ensure your safety during sessions. 
                  This information is kept confidential and shared only with your teachers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Body Heat Map */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-lg"
        >
          <BodyHeatMap 
            selectedInjuries={injuries}
            onInjuriesChange={setInjuries}
            hasCoccyxInjury={hasCoccyxInjury}
            onCoccyxInjuryChange={setHasCoccyxInjury}
          />
         </motion.div>

         {/* No Injuries Toggle Card */}
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.15 }}
           className="w-full max-w-lg bg-white rounded-2xl p-6 border border-[#6E7568]/10 shadow-sm mb-6"
         >
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6E7568] to-[#5a6155] flex items-center justify-center text-white font-bold text-xs">
               ⚠️
             </div>
             <div className="flex-1">
               <p className="text-sm font-bold text-[#26150B] mb-1">No Injuries Confirmation</p>
               <p className="text-[10px] text-[#6E7568]">
                 Confirm that you don't have any current injuries or medical conditions that would prevent safe participation
               </p>
             </div>
           </div>
           <div className="mt-4 flex items-center gap-3">
             <button 
               onClick={() => { setInjuries([]); setNoInjuriesConfirmed(true); }}
               className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-widest transition-all duration-300 ${
                 noInjuriesConfirmed 
                   ? 'bg-[#6E7568] text-[#FBF7EF] shadow-lg' 
                   : 'bg-white border-2 border-[#6E7568]/20 text-[#6E7568] hover:border-[#6E7568]/30'
               }`}
             >
               {noInjuriesConfirmed ? 'Confirmed: No Injuries' : 'Confirm No Injuries'}
             </button>
             <button 
               onClick={() => setNoInjuriesConfirmed(false)}
               className="w-10 h-10 rounded-full bg-[#FBF7EF] flex items-center justify-center text-[10px] text-[#6E7568] hover:bg-[#6E7568]/20 transition-colors"
             >
               <XIcon size={14} />
             </button>
           </div>
           {noInjuriesConfirmed && (
             <div className="mt-3 p-3 rounded-lg bg-[#FBF7EF] border border-[#6E7568]/20 text-[10px] text-[#6E7568]">
               <p className="text-xs font-bold text-[#6E7568] mb-1">Safety Note</p>
               <p className="text-[9px]">
                 For your safety, we recommend consulting with a healthcare professional before participating if you have any concerns about your physical condition.
               </p>
             </div>
           )}
         </motion.div>

         {/* Skip/Continue */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-lg mt-6 flex gap-3"
        >
           <button 
             onClick={() => { 
               if (noInjuriesConfirmed) {
                 setInjuries([]);
                 handleInjuriesContinue();
               } 
             } }
             className="flex-1 py-4 rounded-full bg-white text-[#6E7568] text-xs font-bold uppercase tracking-widest border border-[#6E7568]/10 hover:border-[#6E7568]/30 transition-colors cursor-pointer opacity-60"
           >
             No Injuries
           </button>
          <button 
            onClick={() => handleInjuriesContinue()}
            className="flex-1 py-4 rounded-full bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-[#5a6155] transition-colors cursor-pointer"
          >
            Continue
          </button>
        </motion.div>

        {/* Progress indicator */}
        <div className="flex gap-2 mt-8">
          <div className="w-8 h-1 rounded-full bg-[#6E7568]"></div>
          <div className="w-8 h-1 rounded-full bg-[#6E7568]"></div>
        </div>

      </div>
    );
  }
};
