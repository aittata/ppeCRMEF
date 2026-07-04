// frontend/src/shared/ui/EmptyState.tsx
import React, { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      {icon && <div className="text-3xl mb-3 text-gray-400 dark:text-slate-400 dark:text-slate-500">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-700 dark:text-slate-300">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-400 dark:text-slate-400 dark:text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
