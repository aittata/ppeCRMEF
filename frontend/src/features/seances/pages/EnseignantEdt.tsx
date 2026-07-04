// frontend/src/features/seances/pages/EnseignantEdt.tsx
import React, { useMemo } from 'react';
import { useAuthStore } from '@/shared/store/auth.store';
import { useSeances } from '../hooks/useSeances';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { JOURS_SEMAINE, Seance } from '@/shared/types';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const EnseignantEdt: React.FC = () => {
  const { user } = useAuthStore();
  const { useFindByEnseignant } = useSeances();
  const { data: seances, isLoading, error } = useFindByEnseignant(user?.id || '', true);

  const horaires = ['08:30', '09:30', '10:30', '11:30', '12:30', '14:30', '15:30', '16:30', '17:30'];

  const getSeancesForJour = (jour: string) => {
    return seances?.filter((s: Seance) => s.jourSemaine === jour).sort((a: Seance, b: Seance) => a.heureDebut.localeCompare(b.heureDebut)) || [];
  };

  const calculateStyle = (seance: Seance) => {
    const startHour = parseInt(seance.heureDebut.split(':')[0], 10);
    const startMinute = parseInt(seance.heureDebut.split(':')[1], 10);
    const endHour = parseInt(seance.heureFin.split(':')[0], 10);
    const endMinute = parseInt(seance.heureFin.split(':')[1], 10);

    const startInHours = startHour + startMinute / 60;
    const endInHours = endHour + endMinute / 60;

    const calculateTopPercent = (timeInHours: number) => {
      if (timeInHours <= 12.5) {
        return ((timeInHours - 8.5) / 1) * 12;
      } else if (timeInHours <= 14.5) {
        return 48 + ((timeInHours - 12.5) / 2) * 4;
      } else {
        return 52 + ((timeInHours - 14.5) / 1) * 12;
      }
    };

    const topPct = calculateTopPercent(startInHours);
    const bottomPct = calculateTopPercent(endInHours);

    return {
      top: `${topPct}%`,
      height: `calc(${bottomPct - topPct}% - 4px)`,
      minHeight: '2rem',
    };
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>;
  if (error) return <div className="p-4 text-red-500">Erreur lors du chargement de l'emploi du temps.</div>;

  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-6 relative">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mon Emploi du Temps</h1>
      </div>

      {(!seances || seances.length === 0) ? (
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <EmptyState title="Vous n'avez aucune séance programmée." icon={<CalendarIcon className="w-12 h-12" />} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-auto">
          <div className="flex-1 overflow-auto">
            {/* Mobile View: List */}
            <div className="block md:hidden space-y-6 p-4">
              {JOURS_SEMAINE.map(jour => {
                const js = getSeancesForJour(jour);
                if (js.length === 0) return null;
                return (
                  <div key={jour} className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 border-b pb-2 mb-3">{jour}</h2>
                    <div className="space-y-3">
                      {js.map((s: Seance) => (
                        <div key={s.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg flex flex-col">
                          <div className="text-base font-bold text-blue-950 dark:text-blue-50 leading-tight">Classe {s.classe?.niveau}-{s.classe?.numero}</div>
                          {s.salle && <div className="text-sm font-medium text-blue-700 dark:text-blue-200 truncate mt-1">Salle {s.salle}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop/Tablet View: Grid */}
            <div className="hidden md:flex flex-col flex-1 h-full w-full min-w-[700px]">
              {/* Header */}
              <div className="sticky top-0 z-20 grid grid-cols-[80px_repeat(6,1fr)] border-b border-gray-200 dark:border-slate-700 bg-gray-50/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm">
                <div className="py-1 px-2 border-r border-gray-200 dark:border-slate-700 flex items-center justify-center font-bold tracking-[0.2em] uppercase text-[10px] text-gray-500 dark:text-slate-400">
                  Horaires
                </div>
                {JOURS_SEMAINE.map(jour => (
                  <div key={jour} className="py-1 px-2 border-r border-gray-200 dark:border-slate-700 text-center font-medium text-gray-700 dark:text-slate-300 text-sm">
                    {jour}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="relative grid grid-cols-[80px_repeat(6,1fr)] flex-1">
                {/* Time labels column */}
                <div className="border-r border-gray-200 dark:border-slate-700 h-full">
                  {horaires.map(heure => (
                    <div key={heure} className={`border-b border-gray-100 dark:border-slate-700 px-2 text-xs text-right relative text-gray-400 dark:text-slate-400`} style={{ height: heure === '12:30' ? '4%' : '12%' }}>
                      <span className={`inline-block ${heure !== '08:30' ? '-translate-y-1/2 bg-white dark:bg-slate-800 px-1' : 'py-1'}`}>
                        {heure}
                      </span>
                      {heure === '17:30' && (
                        <span className="absolute bottom-0 right-2 mb-1 inline-block bg-white dark:bg-slate-800 px-1 z-50">
                          18:30
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Days columns */}
                {JOURS_SEMAINE.map(jour => {
                  const js = getSeancesForJour(jour);
                  return (
                    <div key={jour} className="relative border-r border-gray-200 dark:border-slate-700 h-full">
                      {/* Background lines */}
                      {horaires.map(heure => (
                        <div key={heure} className={`border-b w-full ${heure === '12:30' ? 'bg-gray-200 dark:bg-slate-800' : ''}`} style={{ height: heure === '12:30' ? '4%' : '12%' }} />
                      ))}
                      
                      {/* Séance cards */}
                      {js.map((s: Seance) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={s.id}
                          style={calculateStyle(s)}
                          className="absolute left-1 right-1 p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-sm hover:shadow-md hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors z-10 flex flex-col overflow-y-auto card-scrollbar"
                        >
                          <div className="text-sm font-bold text-blue-950 dark:text-blue-50 leading-tight">Classe {s.classe?.niveau}-{s.classe?.numero}</div>
                          {s.salle && <div className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate mt-auto pt-0.5">Salle {s.salle}</div>}
                        </motion.div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnseignantEdt;
