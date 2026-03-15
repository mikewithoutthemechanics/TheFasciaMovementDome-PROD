
import React from 'react';

interface PauseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xl2' | 'hero';
  light?: boolean;
  className?: string;
  hideTagline?: boolean;
  glow?: boolean;
}

export const PauseLogo: React.FC<PauseLogoProps> = ({ size = 'md', className = '', glow = false }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20', 
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    xl2: 'w-40 h-40 sm:w-44 sm:h-44',
    hero: 'w-48 h-48 sm:w-56 sm:h-56'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {glow && (
        <div className={`absolute ${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#FBF7EF]/30 to-[#6E7568]/20 blur-2xl scale-150`}></div>
      )}
      <img 
        src="/logo-transparent.png" 
        alt="The Fascia Movement Dome" 
        className={`${sizeClass} object-contain ${glow ? 'drop-shadow-2xl' : ''}`}
        style={{ width: size === 'hero' ? '180px' : size === 'xl2' ? '160px' : size === 'xl' ? '128px' : size === 'lg' ? '96px' : '80px', height: 'auto' }}
        decoding="async"
      />
    </div>
  );
};
