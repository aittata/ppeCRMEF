// frontend/src/shared/ui/Badge.tsx
import React, { ReactNode } from 'react';
import { EtatAbsence, Role } from '../types';
import { etatBadgeClass, roleBadgeClass } from '../utils/absence.utils';

interface BadgeProps {
  etat?: EtatAbsence;
  role?: Role;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Badge({ etat, role, variant = 'neutral', size = 'sm', children, className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full border';
  
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  const getVariantClass = () => {
    if (etat) return etatBadgeClass(etat);
    if (role) return roleBadgeClass(role);
    switch (variant) {
      case 'success': return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60';
      case 'danger': return 'bg-red-900/40 text-red-300 border-red-700/60';
      case 'warning': return 'bg-amber-900/40 text-amber-300 border-amber-700/60';
      case 'info': return 'bg-blue-900/40 text-blue-300 border-blue-700/60';
      default: return 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-gray-700 dark:text-slate-300 dark:text-slate-300 border-gray-200 dark:border-slate-700 dark:border-slate-700';
    }
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${getVariantClass()} ${className}`}>
      {children}
    </span>
  );
}
