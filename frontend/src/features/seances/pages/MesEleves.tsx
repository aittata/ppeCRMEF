// frontend/src/features/seances/pages/MesEleves.tsx
import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/shared/store/auth.store';
import { useSeances } from '../hooks/useSeances';
import { useEleves } from '@/features/eleves/hooks/useEleves';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select } from '@/shared/ui/Select';
import { Eleve, FilterEleve, Seance } from '@/shared/types';
import { UsersIcon, UserIcon } from 'lucide-react';

const MesEleves: React.FC = () => {
  const { user } = useAuthStore();
  const { useFindByEnseignant } = useSeances();
  const { data: seances, isLoading: isLoadingSeances } = useFindByEnseignant(user?.id || '', true);

  const uniqueClasseIds = useMemo(() => {
    if (!seances) return [];
    return Array.from(new Set(seances.map((s: Seance) => s.classeId).filter(Boolean)));
  }, [seances]);

  const [selectedClasseId, setSelectedClasseId] = useState<string>('');

  const filter: FilterEleve = {
    actif: true,
    limit: 5000,
  };
  
  if (selectedClasseId) {
      filter.classeId = selectedClasseId;
  }

  const { data: elevesData, isLoading: isLoadingEleves } = useEleves(filter);

  const eleves = elevesData?.data || [];

  const groupedEleves = useMemo(() => {
    const groups = new Map<string, { libelle: string; eleves: Eleve[] }>();
    eleves.forEach((e: Eleve) => {
        if (e.classe) {
            if (!groups.has(e.classe.id)) {
                groups.set(e.classe.id, { libelle: `${e.classe.niveau}-${e.classe.numero}`, eleves: [] });
            }
            groups.get(e.classe.id)!.eleves.push(e);
        }
    });
    return Array.from(groups.values()).sort((a,b) => a.libelle.localeCompare(b.libelle));
  }, [eleves]);

  const isLoading = isLoadingSeances || isLoadingEleves;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mes Élèves</h1>
        
        {!isLoadingSeances && uniqueClasseIds.length > 0 && (
            <Select 
              value={selectedClasseId} 
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="w-full md:w-64 bg-white dark:bg-slate-800"
              options={[
                { value: '', label: 'Toutes mes classes' },
                ...uniqueClasseIds.map((cid: any) => {
                    const seance = seances?.find((s: Seance) => s.classeId === cid);
                    const label = seance?.classe ? `${seance.classe.niveau}-${seance.classe.numero}` : cid;
                    return { value: cid, label };
                })
              ]}
            />
        )}
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Spinner /></div>
      ) : eleves.length === 0 ? (
        <EmptyState title="Aucun élève trouvé dans vos classes." icon={<UsersIcon className="w-12 h-12" />} />
      ) : (
        <div className="space-y-8">
            {groupedEleves.map((group) => (
                <div key={group.libelle} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">Classe {group.libelle}</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {group.eleves.length} élèves
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 p-0">
                        {group.eleves.sort((a: Eleve, b: Eleve) => a.nom.localeCompare(b.nom)).map((eleve: Eleve, idx: number) => (
                            <div key={eleve.id} className="p-4 border-b border-gray-100 dark:border-slate-700 last:border-0 md:border-r hover:bg-gray-50/50 dark:bg-slate-900/50 transition-colors flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 dark:text-slate-400 shrink-0">
                                    <UserIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{eleve.nom} {eleve.prenom}</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Massar: {eleve.codeMassar}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MesEleves;
