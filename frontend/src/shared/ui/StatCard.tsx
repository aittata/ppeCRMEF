// frontend/src/shared/ui/StatCard.tsx
import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  titre: string;
  valeur: string | number;
  sousTitre?: string;
  couleur?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
  icon?: ReactNode;
  delayIndex?: number;
}

export function StatCard({ titre, valeur, sousTitre, couleur = 'blue', icon, delayIndex = 0 }: StatCardProps) {
  const colors = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delayIndex * 0.05, duration: 0.3 }}
      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400">{titre}</h4>
        {icon && <div className={`${colors[couleur]}`}>{icon}</div>}
      </div>
      <div>
        <span className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{valeur}</span>
        {sousTitre && <p className={`text-xs mt-1 ${colors[couleur]}`}>{sousTitre}</p>}
      </div>
    </motion.div>
  );
}
