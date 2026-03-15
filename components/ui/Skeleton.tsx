import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height
}) => {
  const baseClasses = 'animate-pulse bg-[#6E7568]/20';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '40px' : '100px')
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Card skeleton for loading states
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-[1.5rem] p-6 border border-[#6E7568]/10 shadow-sm">
    <div className="flex items-start gap-4">
      <Skeleton variant="rectangular" width="64px" height="64px" />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height="20px" />
        <Skeleton width="40%" height="14px" />
      </div>
    </div>
  </div>
);

// List skeleton
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Stats card skeleton
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-5 border border-[#6E7568]/10 shadow-sm">
    <Skeleton width="40%" height="12px" variant="text" />
    <Skeleton width="60%" height="32px" className="mt-2" />
  </div>
);

// Table row skeleton
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <div className="flex items-center gap-4 p-4 border-b border-[#6E7568]/10">
    {Array.from({ length: cols }).map((_, i) => (
      <Skeleton key={i} height="16px" width={i === 0 ? '40px' : '20%'} />
    ))}
  </div>
);
