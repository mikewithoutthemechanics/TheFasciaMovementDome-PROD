import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'calendar' | 'bookings' | 'users' | 'search' | 'default';
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const iconPaths: Record<string, { d: string; viewBox: string }> = {
  calendar: {
    d: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z",
    viewBox: "0 0 24 24"
  },
  bookings: {
    d: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
    viewBox: "0 0 24 24"
  },
  users: {
    d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    viewBox: "0 0 24 24"
  },
  search: {
    d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    viewBox: "0 0 24 24"
  },
  default: {
    d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    viewBox: "0 0 24 24"
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'default',
  actionLabel,
  onAction,
  className = ''
}) => {
  const iconData = iconPaths[icon] || iconPaths.default;

  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      <div className="w-20 h-20 rounded-full bg-[#6E7568]/10 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-[#6E7568]"
          fill="currentColor"
          viewBox={iconData.viewBox}
        >
          <path d={iconData.d} />
        </svg>
      </div>
      
      <h3 className="text-xl font-semibold text-[#26150B] mb-2">
        {title}
      </h3>
      
      <p className="text-[#6E7568] max-w-sm mb-6">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-[#6E7568] text-[#FBF7EF] rounded-xl font-medium
            hover:bg-[#6E7568]/90 transition-colors duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
