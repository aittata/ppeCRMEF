// frontend/src/features/seances/pages/MesClasses.tsx
import React, { useMemo } from 'react';
import { useAuthStore } from '@/shared/store/auth.store';
import { useSeances } from '../hooks/useSeances';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Seance, Classe } from '@/shared/types';
import { UsersIcon, BookOpenIcon, ClockIcon } from 'lucide-react';

const DAYS_ORDER: Record<string, number> = {
  'LUNDI': 1,
  'MARDI': 2,
  'MERCREDI': 3,
  'JEUDI': 4,
  'VENDREDI': 5,
  'SAMEDI': 6,
  'DIMANCHE': 7,
};

const getDayIndex = (day: string) => {
  return DAYS_ORDER[day.toUpperCase()] || 99;
};

const MesClasses: React.FC = () => {
  const { user } = useAuthStore();
  const { useFindByEnseignant } = useSeances();
  const { data: seances, isLoading, error } = useFindByEnseignant(user?.id || '', true);

  const classesMap = useMemo(() => {
    if (!seances) return new Map<string, { classe: Classe, matieres: Set<string>, seances: Seance[] }>();
    
    const map = new Map<string, { classe: Classe, matieres: Set<string>, seances: Seance[] }>();
    seances.forEach((s: Seance) => {
      if (s.classe) {
        if (!map.has(s.classe.id)) {
          map.set(s.classe.id, { classe: s.classe, matieres: new Set(), seances: [] });
        }
        const entry = map.get(s.classe.id)!;
        entry.matieres.add(s.matiere);
        entry.seances.push(s);
      }
    });

    return map;
  }, [seances]);

  const classesList = Array.from(classesMap.values()).sort((a, b) => {
    if (a.classe.niveau === b.classe.niveau) {
        return a.classe.numero - b.classe.numero;
    }
    return a.classe.niveau.localeCompare(b.classe.niveau);
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>;
  if (error) return <div className="p-4 text-red-500">Erreur lors du chargement de vos classes.</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mes Classes</h1>
      </div>

      {classesList.length === 0 ? (
        <EmptyState title="Vous n'avez encore aucune classe associée à vos séances." icon={<UsersIcon className="w-12 h-12" />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesList.map((item) => (
            <div key={item.classe.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
              <div className="px-6 py-4 border-b bg-gray-50/50 dark:bg-slate-900/50 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <UsersIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    Classe {item.classe.niveau} - {item.classe.numero}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium"></p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-2">
                  <ClockIcon size={16} className="text-gray-400 dark:text-slate-400 mt-0.5 min-w-4" />
                  <div>
                    <span className="text-xs text-gray-500 dark:text-slate-400 block uppercase tracking-wider font-semibold mb-1">Créneaux ({item.seances.length})</span>
                    <div className="space-y-1">
                      {[...item.seances].sort((a: Seance, b: Seance) => {
                        const dayA = getDayIndex(a.jourSemaine);
                        const dayB = getDayIndex(b.jourSemaine);
                        if (dayA !== dayB) {
                          return dayA - dayB;
                        }
                        return a.heureDebut.localeCompare(b.heureDebut);
                      }).map((s: Seance) => (
                        <div key={s.id} className="text-sm flex items-center gap-2 flex-wrap">
                          <span className="inline-block min-w-20 font-medium text-gray-700 dark:text-slate-300">{s.jourSemaine}</span>
                          <span className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">{s.heureDebut} - {s.heureFin}</span>
                          {s.salle && <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs">Salle {s.salle}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MesClasses;
