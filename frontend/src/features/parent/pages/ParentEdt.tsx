// frontend/src/features/parent/pages/ParentEdt.tsx
import React, { useState, useEffect } from 'react';
import { useSeances } from '../../seances/hooks/useSeances';
import { useEleves } from '../../eleves/hooks/useEleves';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select } from '@/shared/ui/Select';
import { JOURS_SEMAINE, Seance } from '@/shared/types';
import { CalendarIcon, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const ParentEdt: React.FC = () => {
  const { data: elevesData, isLoading: isLoadingEleves } = useEleves({ page: 1, limit: 100 });
  const childrenList = (elevesData?.data || []).filter((child: any) => child.actif);

  const [selectedChildId, setSelectedChildId] = useState<string>('');

  useEffect(() => {
    if (childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList, selectedChildId]);

  const activeChild = childrenList.find(c => c.id === selectedChildId);
  const classeId = activeChild?.classeId;

  const { useFindByClasse } = useSeances();
  const { data: seances, isLoading: isLoadingSeances } = useFindByClasse(classeId || '', true);

  const horaires = ['08:30', '09:30', '10:30', '11:30', '12:30', '14:30', '15:30', '16:30', '17:30'];

  const getSeancesForJour = (jour: string) => {
    return classeId && seances ? seances.filter((s: Seance) => s.jourSemaine === jour).sort((a: Seance, b: Seance) => a.heureDebut.localeCompare(b.heureDebut)) : [];
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

  if (isLoadingEleves) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            <span>Emploi du temps de mes enfants</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Consultez l'emploi de temps de vos enfants inscrits dans l'établissement.</p>
        </div>

        {childrenList.length > 0 && (
          <div className="w-full sm:w-80">
            <Select
              id="parent-edt-child-select"
              label="Sélectionner un élève"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              options={childrenList.map(child => ({
                value: child.id,
                label: `${child.nom} ${child.prenom} (${child.codeMassar})`
              }))}
            />
          </div>
        )}
      </div>

      {childrenList.length === 0 ? (
        <EmptyState title="Aucun élève n'est encore associé à votre compte parent." description="Veuillez contacter l'administration de l'établissement pour associer vos enfants à votre compte parent." icon={<GraduationCap className="w-12 h-12" />} />
      ) : !classeId ? (
        <EmptyState title="Cet enfant n'est pas encore affecté à une classe." description="Dés que l'administration aura affecté l'élève à sa classe, son emploi du temps apparaîtra ici." icon={<CalendarIcon className="w-12 h-12" />} />
      ) : isLoadingSeances ? (
        <div className="flex justify-center p-8 m-auto"><Spinner /></div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-auto">
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
                          <div key={s.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 animate-fade-in">
                            <div className="flex justify-between items-start">
                              <div className="text-base font-bold text-blue-950 dark:text-blue-50 leading-tight">{s.matiere}</div>
                            </div>
                            <div className="text-sm font-semibold text-blue-800 dark:text-blue-100 mt-0 truncate">{s.enseignant?.prenom} {s.enseignant?.nom}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-300 mt-1 font-medium bg-blue-100/50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded w-max">
                              {s.heureDebut} - {s.heureFin}
                            </div>
                            {s.salle && <div className="text-sm font-medium text-blue-700 dark:text-blue-200 truncate mt-1">Salle {s.salle}</div>}
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

                      {js.map((s: Seance) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={s.id}
                          style={calculateStyle(s)}
                          className="absolute left-1 right-1 p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-sm hover:shadow-md hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors z-10 flex flex-col gap-1 overflow-y-auto card-scrollbar"
                        >
                          <div className="flex justify-between items-start gap-1 pb-1 border-b border-blue-200/30 dark:border-blue-900/30 shrink-0">
                            <div className="text-xs font-bold text-blue-950 dark:text-blue-50 leading-tight break-words line-clamp-2" title={s.matiere}>{s.matiere}</div>
                          </div>
                          <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-200 truncate shrink-0" title={`${s.enseignant?.prenom} ${s.enseignant?.nom}`}>
                            {s.enseignant?.prenom} {s.enseignant?.nom}
                          </div>
                          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-300/80 w-full shrink-0">
                            <span className="whitespace-nowrap shrink-0">{s.heureDebut} - {s.heureFin}</span>
                            {s.salle && <span className="bg-blue-200/50 dark:bg-blue-900/40 px-1 py-0.5 rounded leading-none text-[9px] w-max shrink-0 border border-blue-200/30 dark:border-blue-800/30">Salle {s.salle}</span>}
                          </div>
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

export default ParentEdt;

