// frontend/src/shared/ui/Pagination.tsx
import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  limit?: number;
}

export function Pagination({ page, totalPages, onPageChange, total, limit }: PaginationProps) {
  if (totalPages <= 1) return null;

  const btnClass = "px-3 py-1 border rounded-md text-sm font-medium transition-colors bg-white dark:bg-slate-800 dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:border-slate-700 text-gray-700 dark:text-slate-300 dark:text-slate-300 hover:bg-gray-100 dark:bg-slate-700 hover:text-gray-900 dark:text-slate-100 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed";
  const activeBtnClass = "px-3 py-1 border rounded-md text-sm font-medium transition-colors bg-blue-600 border-blue-600 text-white";

  // Calculate generic page range: max 5 pages
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, page + 2);
  if (page <= 3) {
    end = Math.min(totalPages, 5);
  }
  if (page >= totalPages - 2) {
    start = Math.max(1, totalPages - 4);
  }

  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2">
      <div className="text-sm text-gray-500 dark:text-slate-400 mb-4 sm:mb-0">
        {total !== undefined && limit !== undefined && (
          <span>
            Affichage de <span className="font-medium text-gray-800 dark:text-slate-200">{(page - 1) * limit + 1}</span> à{' '}
            <span className="font-medium text-gray-800 dark:text-slate-200">{Math.min(page * limit, total)}</span> sur{' '}
            <span className="font-medium text-gray-800 dark:text-slate-200">{total}</span> résultats
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={btnClass}
        >
          ←
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={btnClass}>1</button>
            {start > 2 && <span className="text-gray-400 dark:text-slate-400 dark:text-slate-500 px-1">...</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={p === page ? activeBtnClass : btnClass}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-gray-400 dark:text-slate-400 dark:text-slate-500 px-1">...</span>}
            <button onClick={() => onPageChange(totalPages)} className={btnClass}>{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={btnClass}
        >
          →
        </button>
      </div>
    </div>
  );
}
