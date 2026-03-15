import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InjuryRecord, BodyArea } from '../types';

// Body area definitions with SVG path coordinates
const BODY_AREAS: Record<string, { 
  label: string; 
  frontPath: string; 
  backPath?: string;
  bodyArea: BodyArea;
}> = {
  // Front body areas
  head_front: {
    label: 'Head',
    frontPath: 'M50,5 C65,5 75,15 75,30 C75,40 70,48 60,50 L40,50 C30,48 25,40 25,30 C25,15 35,5 50,5',
    bodyArea: 'head'
  },
  neck_front: {
    label: 'Neck',
    frontPath: 'M40,50 L60,50 L62,65 L38,65 Z',
    bodyArea: 'neck'
  },
  left_shoulder_front: {
    label: 'Left Shoulder',
    frontPath: 'M38,65 L25,70 L10,95 L20,100 L35,80 L38,65',
    bodyArea: 'shoulders'
  },
  right_shoulder_front: {
    label: 'Right Shoulder',
    frontPath: 'M62,65 L75,70 L90,95 L80,100 L65,80 L62,65',
    bodyArea: 'shoulders'
  },
  chest: {
    label: 'Chest/Upper Back',
    frontPath: 'M38,65 L62,65 L65,100 L35,100 Z',
    bodyArea: 'spine'
  },
  left_arm_front: {
    label: 'Left Arm',
    frontPath: 'M10,95 L20,100 L15,150 L5,145 Z',
    bodyArea: 'wrists'
  },
  right_arm_front: {
    label: 'Right Arm',
    frontPath: 'M90,95 L80,100 L85,150 L95,145 Z',
    bodyArea: 'wrists'
  },
  abdomen: {
    label: 'Core/Lower Back',
    frontPath: 'M35,100 L65,100 L68,145 L32,145 Z',
    bodyArea: 'lower_back'
  },
  left_hip_front: {
    label: 'Left Hip',
    frontPath: 'M32,145 L48,145 L45,165 L25,165 Z',
    bodyArea: 'hips'
  },
  right_hip_front: {
    label: 'Right Hip',
    frontPath: 'M52,145 L68,145 L75,165 L55,165 Z',
    bodyArea: 'hips'
  },

  left_thigh_front: {
    label: 'Left Thigh',
    frontPath: 'M25,165 L45,165 L42,220 L20,220 Z',
    bodyArea: 'knees'
  },
  right_thigh_front: {
    label: 'Right Thigh',
    frontPath: 'M55,165 L75,165 L80,220 L58,220 Z',
    bodyArea: 'knees'
  },
  left_knee_front: {
    label: 'Left Knee',
    frontPath: 'M20,220 L42,220 L40,250 L18,250 Z',
    bodyArea: 'knees'
  },
  right_knee_front: {
    label: 'Right Knee',
    frontPath: 'M58,220 L80,220 L82,250 L60,250 Z',
    bodyArea: 'knees'
  },
  left_shin_front: {
    label: 'Left Shin/Ankle',
    frontPath: 'M18,250 L40,250 L38,300 L15,300 Z',
    bodyArea: 'ankles'
  },
  right_shin_front: {
    label: 'Right Shin/Ankle',
    frontPath: 'M60,250 L82,250 L85,300 L62,300 Z',
    bodyArea: 'ankles'
  },
};

// Severity levels
const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', description: 'Mild discomfort, doesn\'t limit activity' },
  { value: 'moderate', label: 'Moderate', description: 'Noticeable limitation, needs modification' },
  { value: 'severe', label: 'Severe', description: 'Significant limitation, requires careful attention' },
];

interface BodyHeatMapProps {
  selectedInjuries: InjuryRecord[];
  onInjuriesChange: (injuries: InjuryRecord[]) => void;
  readOnly?: boolean;
  hasCoccyxInjury?: boolean;
  onCoccyxInjuryChange?: (hasCoccyxInjury: boolean) => void;
}

export const BodyHeatMap: React.FC<BodyHeatMapProps> = ({ 
  selectedInjuries, 
  onInjuriesChange,
  readOnly = false,
  hasCoccyxInjury = false,
  onCoccyxInjuryChange
}) => {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [_selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showInjuryModal, setShowInjuryModal] = useState(false);
  const [currentInjury, setCurrentInjury] = useState<Partial<InjuryRecord>>({});
  const [coccyxInjury, setCoccyxInjury] = useState(hasCoccyxInjury);

  // Sync external prop changes
  useEffect(() => {
    setCoccyxInjury(hasCoccyxInjury);
  }, [hasCoccyxInjury]);

  const handleCoccyxToggle = () => {
    const newValue = !coccyxInjury;
    setCoccyxInjury(newValue);
    if (onCoccyxInjuryChange) {
      onCoccyxInjuryChange(newValue);
    }
  };

  // Get injury color for a body area
  const getAreaColor = (areaKey: string) => {
    const injuries = selectedInjuries.filter(i => {
      const area = BODY_AREAS[areaKey];
      return area && i.area === area.bodyArea;
    });
    
    if (injuries.length === 0) return 'rgba(110, 117, 104, 0.1)';
    
    // Return default injury color
    return '#EF4444';
  };

  // Get injury opacity based on severity
  const getAreaOpacity = (areaKey: string) => {
    const injuries = selectedInjuries.filter(i => {
      const area = BODY_AREAS[areaKey];
      return area && i.area === area.bodyArea;
    });
    
    if (injuries.length === 0) return 0.1;
    
    const severity = injuries[0].severity;
    if (severity === 'severe') return 0.8;
    if (severity === 'moderate') return 0.5;
    return 0.3;
  };

  // Handle area click
  const handleAreaClick = (areaKey: string) => {
    if (readOnly) return;
    
    const area = BODY_AREAS[areaKey];
    const existingInjury = selectedInjuries.find(i => i.area === area.bodyArea);
    
    if (existingInjury) {
      // Edit existing injury
      setCurrentInjury(existingInjury);
    } else {
      // New injury
      setCurrentInjury({
        id: `injury-${Date.now()}`,
        area: area.bodyArea,
        description: '',
        severity: 'minor',
      });
    }
    
    setSelectedArea(areaKey);
    setShowInjuryModal(true);
  };

  // Save injury
  const handleSaveInjury = () => {
    if (!currentInjury.area) return;
    
    const injury: InjuryRecord = {
      id: currentInjury.id || `injury-${Date.now()}`,
      area: currentInjury.area,
      description: currentInjury.description || '',
      severity: currentInjury.severity || 'minor',
      injuryType: currentInjury.injuryType,
      dateOccurred: currentInjury.dateOccurred,
      notes: currentInjury.notes,
      modifications: currentInjury.modifications,
    };
    
    // Remove existing injury for same area and add new one
    const updatedInjuries = selectedInjuries.filter(i => i.area !== injury.area);
    updatedInjuries.push(injury);
    
    onInjuriesChange(updatedInjuries);
    setShowInjuryModal(false);
    setCurrentInjury({});
  };

  // Remove injury
  const handleRemoveInjury = (area: BodyArea) => {
    const updatedInjuries = selectedInjuries.filter(i => i.area !== area);
    onInjuriesChange(updatedInjuries);
    setShowInjuryModal(false);
    setCurrentInjury({});
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setView('front')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            view === 'front' 
              ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
              : 'bg-white text-[#6E7568] border border-[#6E7568]/10 hover:border-[#6E7568]/30'
          }`}
        >
          Front View
        </button>
        <button
          onClick={() => setView('back')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            view === 'back' 
              ? 'bg-[#6E7568] text-[#FBF7EF] shadow-md' 
              : 'bg-white text-[#6E7568] border border-[#6E7568]/10 hover:border-[#6E7568]/30'
          }`}
        >
          Back View
        </button>
      </div>

      {/* Body Map */}
      <div className="relative bg-white rounded-[2rem] p-8 border border-[#6E7568]/10 shadow-sm">
        <svg 
          viewBox="0 0 100 320" 
          className="w-full max-w-xs mx-auto"
          style={{ minHeight: '400px' }}
        >
          {/* Body outline */}
          <ellipse cx="50" cy="160" rx="45" ry="140" fill="none" stroke="#6E7568" strokeWidth="0.5" opacity="0.2" />
          
          {/* Clickable body areas */}
          {Object.entries(BODY_AREAS).map(([key, area]) => (
            <motion.path
              key={key}
              d={area.frontPath}
              fill={getAreaColor(key)}
              fillOpacity={getAreaOpacity(key)}
              stroke="#6E7568"
              strokeWidth="0.5"
              strokeOpacity="0.3"
              className={`cursor-pointer transition-all ${!readOnly && 'hover:fill-opacity-50'}`}
              onClick={() => handleAreaClick(key)}
              whileHover={!readOnly ? { scale: 1.02 } : {}}
              whileTap={!readOnly ? { scale: 0.98 } : {}}
            />
          ))}
          
          {/* Injury markers */}
          {selectedInjuries.map(injury => {
            const areaKey = Object.entries(BODY_AREAS).find(
              ([_, area]) => area.bodyArea === injury.area
            )?.[0];
            if (!areaKey) return null;
            
            return (
              <g key={injury.id}>
                <circle
                  cx="50"
                  cy="50"
                  r="3"
                  fill="#EF4444"
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Instructions */}
        <p className="text-center text-xs text-[#6E7568]/60 mt-4">
          {readOnly ? 'Areas highlighted indicate injuries' : 'Click on body areas to indicate injuries'}
        </p>
      </div>

      {/* Coccyx Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#FBF7EF] border border-[#6E7568]/10">
        <div>
          <p className="text-sm font-bold text-[#26150B]">Coccyx Injury</p>
          <p className="text-[10px] text-[#6E7568]">Tailbone/coccyx issues</p>
        </div>
        <button 
          type="button" 
          onClick={handleCoccyxToggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${coccyxInjury ? 'bg-[#6E7568]' : 'bg-[#6E7568]/30'}`}
          disabled={readOnly}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${coccyxInjury ? 'left-7' : 'left-1'}`}></span>
        </button>
      </div>

      {/* Selected Injuries List */}
      {selectedInjuries.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-[#6E7568]/10">
          <h4 className="text-xs font-bold text-[#26150B] uppercase tracking-wider mb-3">
            Recorded Injuries ({selectedInjuries.length})
          </h4>
          <div className="space-y-2">
            {selectedInjuries.map(injury => {
              return (
                <div 
                  key={injury.id}
                  className="flex items-center justify-between p-3 bg-[#FBF7EF] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: '#EF4444' }}
                    />
                    <div>
                      <p className="text-sm font-bold text-[#26150B] capitalize">
                        {injury.area.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-[#6E7568]">
                        Injury • {injury.severity}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveInjury(injury.area)}
                      className="p-1.5 text-[#6E7568]/50 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Injury Modal */}
      <AnimatePresence>
        {showInjuryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#26150B]/60 backdrop-blur-md z-[200] flex items-start justify-center p-4 overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FBF7EF] rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl my-8 flex-shrink-0"
            >
              <h3 className="text-xl font-bold text-[#26150B] mb-6">
                {currentInjury.id && selectedInjuries.find(i => i.id === currentInjury.id)
                  ? 'Edit Injury'
                  : 'Add Injury'}
              </h3>

              <div className="space-y-5">
                {/* Body Area */}
                <div>
                  <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">
                    Body Area
                  </label>
                  <select
                    value={currentInjury.area || ''}
                    onChange={e => setCurrentInjury({ ...currentInjury, area: e.target.value as BodyArea })}
                    className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                   >
                     <option value="">Select area...</option>
                     <option value="head">Head/Neck</option>
                     <option value="shoulders">Shoulders</option>
                     <option value="spine">Spine/Upper Back</option>
                     <option value="lower_back"> Lower Back</option>
                     <option value="hips">Hips</option>
                     <option value="knees">Knees</option>
                     <option value="ankles">Ankles/Feet</option>
                     <option value="wrists">Wrists/Hands</option>
                     <option value="full_body">Full Body</option>
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">
                    Severity
                  </label>
                  <div className="space-y-2">
                    {SEVERITY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setCurrentInjury({ ...currentInjury, severity: level.value as any })}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          currentInjury.severity === level.value
                            ? 'bg-[#6E7568] text-[#FBF7EF]'
                            : 'bg-white border border-[#6E7568]/10 text-[#26150B] hover:border-[#6E7568]/30'
                        }`}
                      >
                        <p className="text-xs font-bold">{level.label}</p>
                        <p className={`text-[10px] ${currentInjury.severity === level.value ? 'text-[#FBF7EF]/70' : 'text-[#6E7568]'}`}>
                          {level.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">
                    Description (Optional)
                  </label>
                  <textarea
                    value={currentInjury.description || ''}
                    onChange={e => setCurrentInjury({ ...currentInjury, description: e.target.value })}
                    placeholder="E.g., 'Rotator cuff injury from 2022, still gets stiff in cold weather'"
                    className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50 resize-none h-20"
                  />
                </div>

                {/* Modifications */}
                <div>
                  <label className="text-xs font-bold text-[#6E7568] uppercase tracking-wider mb-2 block">
                    Movement Modifications Needed
                  </label>
                  <input
                    type="text"
                    value={currentInjury.modifications || ''}
                    onChange={e => setCurrentInjury({ ...currentInjury, modifications: e.target.value })}
                    placeholder="E.g., 'Avoid deep squats', 'Use props for support'"
                    className="w-full p-4 rounded-xl bg-white border border-[#6E7568]/10 text-[#26150B] text-sm outline-none focus:border-[#6E7568]/50"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowInjuryModal(false);
                    setCurrentInjury({});
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#6E7568]/10 text-[#6E7568] text-xs font-bold uppercase tracking-wider hover:bg-[#6E7568]/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInjury}
                  disabled={!currentInjury.area}
                  className="flex-1 py-3 rounded-xl bg-[#6E7568] text-[#FBF7EF] text-xs font-bold uppercase tracking-wider hover:bg-[#5a6155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Injury
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BodyHeatMap;
