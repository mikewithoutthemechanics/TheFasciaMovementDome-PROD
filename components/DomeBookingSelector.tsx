
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../constants';

interface DomeBookingSelectorProps {
  capacity: number;
  registeredCount: number;
  selectedSpot?: number; // Just for visual feedback if we were tracking specific spots
  onSelect?: () => void; // Dummy handler for the visual effect
}

export const DomeBookingSelector: React.FC<DomeBookingSelectorProps> = ({ capacity, registeredCount, onSelect }) => {
  // Generate spots in a dome/arc layout
  // 3 concentric semi-circles totaling 15 spots (max capacity)
  
  const spots: { id: number; x: number; y: number }[] = [];
  const rows = [
    { radius: 140, count: 7, yOffset: 20 },  // Outer
    { radius: 100, count: 5, yOffset: 20 },  // Middle
    { radius: 60, count: 3, yOffset: 20 }    // Inner
  ];

  let spotIndex = 0;

  rows.forEach((row) => {
    const angleStep = 180 / (row.count + 1);
    for (let i = 1; i <= row.count; i++) {
        const angle = i * angleStep; // 0 to 180
        const radian = (angle * Math.PI) / 180;
        
        const x = 150 - row.radius * Math.cos(radian); 
        const y = 170 - row.radius * Math.sin(radian) + row.yOffset;
        
        spots.push({ id: spotIndex, x, y });
        spotIndex++;
    }
  });

  const displaySpots = spots.slice(0, capacity);
  const takenIndices = Array.from({ length: registeredCount }, (_, i) => i);

  return (
    <div className="relative w-full aspect-[4/3] max-w-[300px] mx-auto my-6 select-none bg-[#FBF7EF] rounded-3xl border border-[#26150B]/5 shadow-inner">
       {/* Stage/Front indicator */}
       <div className="absolute bottom-4 left-0 w-full text-center">
            <div className="text-[9px] font-bold uppercase tracking-[4px]" style={{ color: COLORS.sage }}>Teacher Stage</div>
            <div className="h-1 w-2/3 mx-auto bg-[#6E7568]/10 rounded-full mt-1"></div>
       </div>

       <svg viewBox="0 0 300 220" className="w-full h-full overflow-visible drop-shadow-sm">
          {displaySpots.map((spot, i) => {
              const isTaken = takenIndices.includes(i);
              const isSelected = !isTaken && i === registeredCount; 
              
              // Colors based on state
              const fillColor = isTaken ? COLORS.espresso : isSelected ? COLORS.rust : COLORS.cream;
              const strokeColor = isTaken ? 'none' : COLORS.sage;
              
              return (
                  <motion.g 
                    key={spot.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={!isTaken ? onSelect : undefined}
                    style={{ cursor: isTaken ? 'not-allowed' : 'pointer' }}
                  >
                      <circle 
                        cx={spot.x} 
                        cy={spot.y} 
                        r={isSelected ? 10 : 7} 
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isTaken ? 0 : isSelected ? 0 : 2}
                        className="transition-all duration-300"
                        opacity={isTaken ? 0.4 : 1}
                      />
                      
                      {isSelected && (
                          <motion.circle 
                            cx={spot.x} 
                            cy={spot.y} 
                            r={14}
                            fill="none"
                            stroke={COLORS.rust}
                            strokeWidth="1"
                            initial={{ opacity: 0.5, scale: 0.8 }}
                            animate={{ opacity: 0, scale: 1.5 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                      )}
                  </motion.g>
              )
          })}
       </svg>
       
       <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full border-2 bg-[#FBF7EF]" style={{ borderColor: COLORS.sage }}></div>
                <span className="text-[8px] uppercase text-[#26150B]/40 font-bold">Open</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.rust }}></div>
                <span className="text-[8px] uppercase text-[#26150B]/40 font-bold">Selected</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: COLORS.espresso }}></div>
                <span className="text-[8px] uppercase text-[#26150B]/40 font-bold">Taken</span>
            </div>
       </div>
    </div>
  );
};
