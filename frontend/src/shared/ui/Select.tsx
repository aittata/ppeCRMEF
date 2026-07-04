// frontend/src/shared/ui/Select.tsx
import React, { SelectHTMLAttributes, forwardRef } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: Option[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', placeholder, ...props }, ref) => {
    const selectClasses = `
      w-full bg-white dark:bg-slate-800 dark:bg-slate-800 border appearance-none rounded-md text-gray-900 dark:text-slate-100 dark:text-slate-100 
      focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
      transition-colors duration-200 sm:text-sm pl-3 pr-10 py-2
      ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
      ${props.disabled ? 'opacity-50 cursor-not-allowed bg-white dark:bg-slate-800 dark:hover:bg-gray-100 dark:hover:bg-slate-800/50' : ''}
      ${className}
    `;

    return (
      <div className="w-full flex flex-col">
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <select ref={ref} className={selectClasses} {...props}>
            {placeholder && (
              <option value="" disabled className="text-gray-400 dark:text-slate-400 dark:text-slate-500">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="mt-1 text-xs text-red-400">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
