// frontend/src/features/parent/pages/ParentAbsences.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAbsences } from '../../absences/hooks/useAbsences';
import { useEleves } from '../../eleves/hooks/useEleves';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select } from '@/shared/ui/Select';
import { Absence, EtatAbsence, ETAT_LABELS } from '@/shared/types';
import { CalendarIcon, GraduationCap, ClipboardList, Info } from 'lucide-react';

const ParentAbsences: React.FC = () => {
  const { data: elevesData, isLoading: isLoadingEleves } = useEleves({ page: 1, limit: 100 });
  const childrenList = (elevesData?.data || []).filter((child: any) => child.actif);

  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    return {
      eleveId: selectedChildId || undefined,
      page,
      limit: 50
    };
  }, [selectedChildId, page]);

  const { data: absencesPage, isLoading: isLoadingAbsences } = useAbsences(filters);
  
  const activeChildrenIds = useMemo(() => new Set(childrenList.map(c => c.id)), [childrenList]);
  const absences = useMemo(() => {
    const rawAbsences = (absencesPage?.data || []) as Absence[];
    return rawAbsences.filter(abs => activeChildrenIds.has(abs.eleveId));
  }, [absencesPage, activeChildrenIds]);

  if (isLoadingEleves) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50/50 dark:bg-slate-900/50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            <span>Suivi des absences</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Consultez et suivez l'assiduité et les absences enregistrées pour vos enfants.</p>
        </div>

        {childrenList.length > 0 && (
          <div className="w-full sm:w-80">
            <Select
              id="parent-absences-child-select"
              label="Filtrer par élève"
              value={selectedChildId}
              onChange={(e) => {
                setSelectedChildId(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: `Tous mes enfants (${childrenList.length})` },
                ...childrenList.map(child => ({
                  value: child.id,
                  label: `${child.nom} ${child.prenom} (${child.codeMassar})`
                }))
              ]}
            />
          </div>
        )}
      </div>

      {childrenList.length === 0 ? (
        <EmptyState title="Aucun élève n'est encore associé à votre compte parent." description="Veuillez contacter l'administration de l'établissement pour associer vos enfants à votre compte parent." icon={<GraduationCap className="w-12 h-12" />} />
      ) : isLoadingAbsences ? (
        <div className="p-12 flex justify-center"><Spinner /></div>
      ) : absences.length === 0 ? (
        <EmptyState title="Aucune absence enregistrée pour vos enfants." description="Félicitations ! Vos enfants font preuve d'une excellente assiduité." icon={<ClipboardList className="text-gray-400 dark:text-slate-400 w-12 h-12" />} />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Élève</th>
                    <th className="px-6 py-4 font-semibold">Date & Heures</th>
                    <th className="px-6 py-4 font-semibold">Classe</th>
                    <th className="px-6 py-4 font-semibold">Matière</th>
                    <th className="px-6 py-4 font-semibold">État</th>
                    <th className="px-6 py-4 font-semibold">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {absences.map((abs) => (
                    <tr key={abs.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {abs.eleve?.prenom[0]}
                        </span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span>{abs.eleve?.nom} {abs.eleve?.prenom}</span>
                          <span className="text-xs font-mono font-normal text-gray-500 dark:text-slate-400">({abs.eleve?.codeMassar})</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block font-medium text-gray-900 dark:text-slate-100">
                          {typeof abs.date === 'string' ? abs.date.slice(0, 10) : abs.date}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {abs.heureDebut} - {abs.heureFin}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {abs.classe ? `${abs.classe.niveau}-${abs.classe.numero}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-slate-200 font-medium">
                        {abs.seance?.matiere || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block
                          ${abs.etat === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200 border border-amber-200/50' :
                            abs.etat === 'JUSTIFIEE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200 border border-emerald-200/50' :
                            'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-200 border border-red-200/50'}`}
                        >
                          {ETAT_LABELS[abs.etat as EtatAbsence]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-slate-400 max-w-sm truncate text-xs font-normal">
                        {abs.motif || (
                          <span className="italic text-gray-400 dark:text-slate-500">Aucun motif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-blue-100/50 dark:border-slate-700/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              Pour justifier une absence de votre enfant, veuillez soumettre une justification écrite signée, accompagnée d'un justificatif légal (certificat médical, etc.), auprès du cadre administratif de l'établissement sous 48 heures.
            </div>
          </div>
        </div>
      )}

      {!isLoadingAbsences && absences.length >= 50 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setPage(r => r + 1)}
            className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-sm font-medium text-blue-600 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-md transition-colors"
          >
            Page suivante
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentAbsences;
