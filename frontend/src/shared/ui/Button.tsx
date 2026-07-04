// frontend/src/shared/ui/Button.tsx
import React, { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Spinner } from './Spinner';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500';
  
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-transparent',
    secondary: 'bg-gray-100 dark:bg-slate-700 hover:bg-slate-600 text-gray-900 dark:text-slate-100 dark:text-slate-100 border border-transparent',
    danger: 'bg-red-600 hover:bg-red-500 text-white border border-transparent',
    ghost: 'hover:bg-white dark:bg-slate-800 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 dark:text-slate-100 bg-transparent border border-transparent',
    outline: 'border border-gray-300 dark:border-slate-600 hover:bg-white dark:bg-slate-800 dark:bg-slate-800 text-gray-800 dark:text-slate-200 dark:text-slate-200 bg-transparent',
  };

  const isDisabled = disabled || loading;
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.02 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      disabled={isDisabled}
      className={classes}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </motion.button>
  );
}
