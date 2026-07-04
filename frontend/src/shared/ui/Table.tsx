// frontend/src/shared/ui/Table.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Column } from '../types';
import { EmptyState } from './EmptyState';

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({ columns, data, loading, emptyMessage = 'Aucune donnée', onRowClick }: TableProps<T>) {
  return (
    <div className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <td key={`skeleton-${i}-${j}`} className="px-6 py-4">
                      <div className="bg-gray-100 dark:bg-slate-700 animate-pulse h-4 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <EmptyState title={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ staggerChildren: 0.03 }}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`bg-white dark:bg-slate-800 dark:bg-slate-800 transition-colors ${
                    onRowClick ? 'hover:bg-gray-100 dark:bg-slate-700/50 cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-sm text-gray-800 dark:text-slate-200">
                      {col.render ? col.render(row, i) : String((row as any)[col.key])}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
