
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckIcon, AlertIcon, InfoIcon } from './Icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const iconClass = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500'
  }[type];
  
  const icons = {
    success: <CheckIcon size={18} />,
    error: <XIcon size={18} />,
    warning: <AlertIcon size={18} />,
    info: <InfoIcon size={18} />
  };
  
  return <span className={iconClass}>{icons[type]}</span>;
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItemComponent({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 bg-white rounded-xl shadow-lg border border-[#26150B]/10 p-4 min-w-[280px] max-w-[400px]"
    >
      <ToastIcon type={toast.type} />
      <p className="text-sm text-[#26150B] flex-1 font-medium">{toast.message}</p>
      <button 
        onClick={onClose}
        className="text-[#26150B]/40 hover:text-[#26150B] transition-colors"
        aria-label="Close notification"
      >
        <XIcon size={16} />
      </button>
    </motion.div>
  );
}

const ToastItem = React.memo(ToastItemComponent);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem 
              key={toast.id} 
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
