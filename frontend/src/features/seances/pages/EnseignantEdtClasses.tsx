// frontend/src/features/seances/pages/EnseignantEdtClasses.tsx
import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/shared/store/auth.store';
import { useSeances } from '../hooks/useSeances';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select } from '@/shared/ui/Select';
import { JOURS_SEMAINE, Seance, Classe } from '@/shared/types';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const EnseignantEdtClasses: React.FC = () => {
  const { user } = useAuthStore();
  const { useFindByClasse, useFindByEnseignant } = useSeances();
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  
  // Get all seances of the teacher to extract their classes
  const { data: mySeances, isLoading: isLoadingMySeances } = useFindByEnseignant(user?.id || '', true);
  
  const myClasses = useMemo(() => {
    if (!mySeances) return [];
    const map = new Map<string, Classe>();
    mySeances.forEach((s: Seance) => {
      if (s.classe) {
        map.set(s.classe.id, s.classe);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.niveau === b.niveau) return a.numero - b.numero;
      return a.niveau.localeCompare(b.niveau);
    });
  }, [mySeances]);

  // Set the first class as selected by default when classes load
  React.useEffect(() => {
    if (myClasses.length > 0 && !selectedClasseId) {
      setSelectedClasseId(myClasses[0].id);
    }
  }, [myClasses, selectedClasseId]);

  // Fetch the full schedule for the selected class
  const { data: seances, isLoading: isLoadingSeances } = useFindByClasse(selectedClasseId, selectedClasseId !== '');

  const horaires = ['08:30', '09:30', '10:30', '11:30', '12:30', '14:30', '15:30', '16:30', '17:30'];

  const getSeancesForJour = (jour: string) => {
    return selectedClasseId && seances ? seances.filter((s: Seance) => s.jourSemaine === jour).sort((a: Seance, b: Seance) => a.heureDebut.localeCompare(b.heureDebut)) : [];
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
      minHeight: '4.25rem', // ensures info is never clipped on narrow grids
    };
  };

  if (isLoadingMySeances) {
    return <div className="p-8 flex justify-center"><Spinner /></div>;
  }

  if (myClasses.length === 0) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Emplois du Temps (Mes Classes)</h1>
        <EmptyState title="Vous n'avez encore aucune classe associée à vos séances." icon={<CalendarIcon className="w-12 h-12" />} />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:h-full p-4 md:p-8 space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Emplois du Temps (Mes Classes)</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <Select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="w-full"
              options={[
                  { value: '', label: '-- Choisir une de mes classes --' },
                  ...myClasses.map(c => ({ value: c.id, label: `${c.niveau}-${c.numero}` }))
              ]}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 md:min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-auto">
        {!selectedClasseId ? (
          <EmptyState title="Veuillez sélectionner une classe pour voir son emploi du temps." icon={<CalendarIcon className="w-12 h-12" />} />
        ) : isLoadingSeances ? (
          <div className="flex justify-center p-8 m-auto"><Spinner /></div>
        ) : (
          <div className="flex-1 overflow-auto">
              {/* Mobile View */}
              <div className="block md:hidden space-y-6 p-4">
                  {(!seances || seances.length === 0) ? (
                      <EmptyState title="Aucune séance programmée pour cette classe." icon={<CalendarIcon className="w-12 h-12" />} />
                  ) : (
                      JOURS_SEMAINE.map(jour => {
                        const js = getSeancesForJour(jour);
                        if (js.length === 0) return null;
                        return (
                            <div key={jour} className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 border-b pb-2 mb-3">{jour}</h2>
                            <div className="space-y-3">
                                {js.map((s: Seance) => (
                                <div key={s.id} className={`p-3 border-l-4 rounded-r-lg flex flex-col hover:bg-opacity-80 transition-colors animate-fade-in ${s.enseignantId === user?.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-gray-50/50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700'}`}>
                                    <div className={`text-base font-bold leading-tight ${s.enseignantId === user?.id ? 'text-blue-950 dark:text-blue-50' : 'text-gray-900 dark:text-slate-100'}`}>{s.matiere}</div>
                                    <div className={`text-sm font-semibold mt-0 truncate ${s.enseignantId === user?.id ? 'text-blue-800 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>{s.enseignant?.prenom} {s.enseignant?.nom}</div>
                                    <div className={`text-xs mt-1 font-medium px-1.5 py-0.5 rounded w-max ${s.enseignantId === user?.id ? 'text-blue-600 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/40' : 'text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-slate-800/40'}`}>
                                      {s.heureDebut} - {s.heureFin}
                                    </div>
                                    {s.salle && <div className={`text-sm font-medium truncate mt-1 ${s.enseignantId === user?.id ? 'text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>Salle {s.salle}</div>}
                                </div>
                                ))}
                            </div>
                            </div>
                        );
                      })
                  )}
              </div>

               {/* Desktop View */}
              <div className="hidden md:flex flex-col flex-1 h-full w-full min-w-[800px] min-h-[550px]">
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

                  <div className="relative grid grid-cols-[80px_repeat(6,1fr)] flex-1">
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

                      {JOURS_SEMAINE.map(jour => {
                      const js = getSeancesForJour(jour);
                      return (
                          <div key={jour} className="relative border-r border-gray-200 dark:border-slate-700 h-full">
                          {horaires.map(heure => (
                              <div key={heure} className={`border-b w-full ${heure === '12:30' ? 'bg-gray-200 dark:bg-slate-800' : ''}`} style={{ height: heure === '12:30' ? '4%' : '12%' }} />
                          ))}
                          
                          {js.map((s: Seance) => {
                              const isMyCourse = s.enseignantId === user?.id;
                              return (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={s.id}
                                style={calculateStyle(s)}
                                className={`absolute left-1 right-1 p-1.5 rounded-lg border shadow-sm z-10 flex flex-col gap-1 overflow-y-auto card-scrollbar transition-colors
                                  ${isMyCourse 
                                    ? 'bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-900/60' 
                                    : 'bg-gray-100 dark:bg-slate-800/85 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                              >
                                 <div className={`flex justify-between items-start gap-1 pb-1 border-b shrink-0 ${isMyCourse ? 'border-blue-200/30 dark:border-blue-900/30' : 'border-gray-200/30 dark:border-slate-700/50'}`}>
                                    <div className={`text-xs font-bold leading-tight break-words line-clamp-2 ${isMyCourse ? 'text-blue-950 dark:text-blue-50' : 'text-gray-900 dark:text-slate-100'}`} title={s.matiere}>{s.matiere}</div>
                                 </div>
                                 <div className={`text-[11px] font-semibold truncate shrink-0 ${isMyCourse ? 'text-blue-800 dark:text-blue-200' : 'text-gray-800 dark:text-slate-300'}`} title={`${s.enseignant?.prenom} ${s.enseignant?.nom}`}>
                                    {s.enseignant?.prenom} {s.enseignant?.nom}
                                 </div>
                                 <div className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-1 text-[10px] font-medium w-full shrink-0 ${isMyCourse ? 'text-blue-600 dark:text-blue-300/80' : 'text-gray-500 dark:text-slate-400/80'}`}>
                                    <span className="whitespace-nowrap shrink-0">{s.heureDebut} - {s.heureFin}</span>
                                    {s.salle && <span className={`px-1 py-0.5 rounded leading-none text-[9px] w-max shrink-0 border ${isMyCourse ? 'bg-blue-200/50 dark:bg-blue-900/40 border-blue-200/30 dark:border-blue-800/30' : 'bg-gray-200/50 dark:bg-slate-700/40 border-gray-200/30 dark:border-slate-600/30'}`}>Salle {s.salle}</span>}
                                 </div>
                              </motion.div>
                              );
                          })}
                          </div>
                      );
                      })}
                  </div>
              </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EnseignantEdtClasses;
