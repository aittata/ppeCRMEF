// frontend/src/shared/ui/Input.tsx
import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightElement, className = '', ...props }, ref) => {
    const inputClasses = `
      w-full bg-white dark:bg-slate-800 dark:bg-slate-800 border rounded-md text-gray-900 dark:text-slate-100 dark:text-slate-100 
      focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
      transition-colors duration-200 sm:text-sm
      ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
      ${icon ? 'pl-10' : 'pl-3'}
      ${rightElement ? 'pr-10' : 'pr-3'}
      py-2
      ${props.disabled ? 'opacity-50 cursor-not-allowed bg-white dark:bg-slate-800 dark:hover:bg-gray-100 dark:hover:bg-slate-800/50' : ''}
      ${className}
    `;

    return (
      <div className="w-full flex flex-col">
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            {label} {props.required && <span className="text-red-500" id={"required-star-" + label.toLowerCase().replace(/\s+/g, '-')}>*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-gray-500 dark:text-slate-400 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input ref={ref} className={inputClasses} {...props} />
          {rightElement && (
            <div className="absolute right-3 text-gray-500 dark:text-slate-400 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <span className="mt-1 text-xs text-red-400">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
