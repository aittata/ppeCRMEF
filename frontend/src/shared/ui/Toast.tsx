// frontend/src/shared/ui/Toast.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Toast as ToastType } from '../types';

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

const icons = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
  warning: '⚠',
};

const colors = {
  success: 'bg-emerald-900 border-emerald-700 text-emerald-100',
  error: 'bg-red-900 border-red-700 text-red-100',
  info: 'bg-blue-900 border-blue-700 text-blue-100',
  warning: 'bg-amber-900 border-amber-700 text-amber-100',
};

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(({ toast, onClose }, ref) => {
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`pointer-events-auto flex items-center gap-3 w-full max-w-sm rounded-lg border p-4 shadow-lg ${colors[toast.type]}`}
    >
      <div className="flex-shrink-0 font-bold">{icons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium whitespace-pre-wrap">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="text-white/60 hover:text-white transition-colors p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
});

Toast.displayName = 'Toast';
