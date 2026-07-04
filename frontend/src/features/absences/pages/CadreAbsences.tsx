// frontend/src/features/absences/pages/CadreAbsences.tsx
import React, { useState, useMemo } from 'react';
import { useAbsences, useUpdateEtatAbsence, useExportAbsences, useBulkUpdateEtatAbsence } from '../hooks/useAbsences';
import { Absence, EtatAbsence, FilterAbsence } from '@/shared/types';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Modal } from '@/shared/ui/Modal';
import { DownloadIcon, UserIcon, CheckIcon, XIcon, Search, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { ETAT_LABELS } from '@/shared/types';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { useEleves } from '@/features/eleves/hooks/useEleves';

const CadreAbsences: React.FC = () => {
  const [page, setPage] = useState(1);
  const [baseFilters, setBaseFilters] = useState<Partial<FilterAbsence>>({});
  const [searchInput, setSearchInput] = useState('');
  const [selectedAbsences, setSelectedAbsences] = useState<Set<string>>(new Set());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  const { data: datesLookupPage } = useAbsences({ limit: 10000 });

  const uniqueDates = useMemo(() => {
    if (!datesLookupPage?.data) return [];
    const datesSet = new Set<string>();
    datesLookupPage.data.forEach((abs: any) => {
      if (abs.date) {
        const dStr = typeof abs.date === 'string' ? abs.date.slice(0, 10) : new Date(abs.date).toISOString().slice(0, 10);
        datesSet.add(dStr);
      }
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [datesLookupPage?.data]);

  const handleDateFilterChange = (val: string) => {
    setSelectedDateFilter(val);
    setPage(1);
    setSelectedAbsences(new Set());
    setBaseFilters(prev => ({
      ...prev,
      dateDebut: val || undefined,
      dateFin: val || undefined
    }));
  };

  const filters: FilterAbsence = useMemo(() => {
    return {
      ...baseFilters,
      page,
      limit: 50
    };
  }, [page, baseFilters]);

  const { data: absencesPage, isLoading, isError } = useAbsences(filters);
  const { mutate: updateEtat, isPending: isUpdating } = useUpdateEtatAbsence();
  const { mutate: bulkUpdateEtat, isPending: isBulkUpdating } = useBulkUpdateEtatAbsence();
  const { mutate: exportXls, isPending: isExporting } = useExportAbsences();
  
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [motif, setMotif] = useState('');

  // Pour l'export & listes
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<FilterAbsence>({});
  
  const { data: classesRaw } = useClasses({ actif: true });
  const classesList = Array.isArray(classesRaw) ? classesRaw : (classesRaw as any)?.data || [];

  const { data: elevesRaw } = useEleves({ classeId: baseFilters.classeId, limit: 1000 } as any);
  const elevesList = (elevesRaw?.data || []) as any[];

  const absences = (absencesPage?.data || []) as Absence[];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setBaseFilters(f => ({ ...f, search: searchInput || undefined }));
    setPage(1);
    setSelectedAbsences(new Set());
  };

  const handleOpenModal = (abs: Absence) => {
    setSelectedAbsence(abs);
    setMotif(abs.motif || '');
  };

  const handleUpdateEtat = (newEtat: Exclude<EtatAbsence, 'EN_ATTENTE'>) => {
    if (!selectedAbsence) return;
    updateEtat({ id: selectedAbsence.id, payload: { etat: newEtat, motif } }, {
      onSuccess: () => setSelectedAbsence(null)
    });
  };

  const handleBulkNonJustifiee = () => {
    if (selectedAbsences.size === 0) return;
    bulkUpdateEtat({
      ids: Array.from(selectedAbsences),
      etat: 'NON_JUSTIFIEE',
    }, {
      onSuccess: () => {
        setSelectedAbsences(new Set());
      }
    });
  };

  const executeExport = () => {
    exportXls(exportFilters, {
      onSuccess: () => setIsExportModalOpen(false)
    });
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedAbsences);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAbsences(next);
  };

  const toggleAll = () => {
    if (absences.length > 0) {
      const allSelected = absences.every(abs => selectedAbsences.has(abs.id));
      const next = new Set(selectedAbsences);
      if (allSelected) {
        absences.forEach(abs => next.delete(abs.id));
      } else {
        absences.forEach(abs => next.add(abs.id));
      }
      setSelectedAbsences(next);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-blue-900 dark:text-blue-400">Gestion des Absences</h1>
          {selectedAbsences.size > 0 && (
            <div className="flex bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm animate-fade-in">
              <button
                onClick={handleBulkNonJustifiee}
                disabled={isBulkUpdating}
                className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors h-full flex items-center gap-1.5 disabled:opacity-50"
              >
                <XIcon className="w-4 h-4" />
                Déf. Non Justifiée ({selectedAbsences.size})
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors text-sm"
        >
          <DownloadIcon className="w-5 h-5" />
          Exporter les absences
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par élève ou code Massar..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-gray-100 dark:bg-slate-700 hover:bg-slate-600 text-gray-800 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition-colors">
            Rechercher
          </button>
        </form>

        <div className="flex flex-wrap gap-4 items-center">
          <select
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
            value={selectedDateFilter || ''}
            onChange={e => handleDateFilterChange(e.target.value)}
          >
            <option value="">Toutes les dates</option>
            {uniqueDates.map(dStr => {
              const parts = dStr.split('-');
              const label = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
              return (
                <option key={dStr} value={dStr}>
                  {label}
                </option>
              );
            })}
          </select>

          <select
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
            value={baseFilters.etat || ''}
            onChange={e => {
              setBaseFilters(f => ({ ...f, etat: (e.target.value as EtatAbsence) || undefined }));
              setPage(1);
              setSelectedAbsences(new Set());
            }}
          >
            <option value="">Tous les statuts d'absence</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="JUSTIFIEE">Justifiée</option>
            <option value="NON_JUSTIFIEE">Non justifiée</option>
          </select>

          <select
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
            value={baseFilters.classeId || ''}
            onChange={e => {
              setBaseFilters(f => ({ ...f, classeId: e.target.value || undefined, eleveId: undefined }));
              setPage(1);
              setSelectedAbsences(new Set());
            }}
          >
            <option value="">Toutes les classes</option>
            {classesList.map((c: any) => (
              <option key={c.id} value={c.id}>{c.libelle || `${c.niveau}-${c.numero}`}</option>
            ))}
          </select>

          <select
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
            value={baseFilters.eleveId || ''}
            onChange={e => {
              setBaseFilters(f => ({ ...f, eleveId: e.target.value || undefined }));
              setPage(1);
              setSelectedAbsences(new Set());
            }}
            disabled={!baseFilters.classeId}
          >
            <option value="">Tous les élèves</option>
            {elevesList.map((e: any) => (
              <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 shadow-sm">
              <tr className="border-b border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                    checked={absences.length > 0 && absences.every(abs => selectedAbsences.has(abs.id))}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-4">Date & Créneau</th>
                <th className="p-4">Élève</th>
                <th className="p-4">Classe</th>
                <th className="p-4">Matière</th>
                <th className="p-4">Enseignant</th>
                <th className="p-4">État</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-slate-400">
                    <div className="flex justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-slate-400">
                    Erreur lors du chargement des absences
                  </td>
                </tr>
              ) : absences.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-slate-400">
                    Aucune absence trouvée
                  </td>
                </tr>
              ) : (
                absences.map((abs) => (
                  <tr key={abs.id} className="border-b border-gray-200 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                        checked={selectedAbsences.has(abs.id)}
                        onChange={() => toggleSelection(abs.id)}
                      />
                    </td>
                    <td className="p-4">
                       <span className="block font-medium text-gray-900 dark:text-slate-100">{typeof abs.date === 'string' ? abs.date.slice(0, 10) : abs.date}</span>
                       <span className="text-xs text-gray-500 dark:text-slate-400">{abs.heureDebut} - {abs.heureFin}</span>
                    </td>
                    <td className="p-4 text-gray-900 dark:text-slate-100 font-medium font-sans">
                      <span className="block">{abs.eleve?.nom} {abs.eleve?.prenom}</span>
                      <span className="block text-xs font-normal text-gray-500 dark:text-slate-400">{abs.eleve?.codeMassar}</span>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-slate-300 font-sans">
                      {abs.classe ? (abs.classe.libelle || `${abs.classe.niveau}-${abs.classe.numero}`) : <span className="text-gray-400 dark:text-slate-500 italic">Aucune</span>}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-slate-300 font-sans">{abs.matiere}</td>
                    <td className="p-4 text-gray-700 dark:text-slate-300 font-sans">
                      {abs.saisiePar ? `${abs.saisiePar.nom} ${abs.saisiePar.prenom}` : <span className="text-gray-400 dark:text-slate-500 italic">-</span>}
                    </td>
                    <td className="p-4">
                      {abs.etat === 'EN_ATTENTE' ? (
                        <span className="bg-amber-500/10 text-amber-500 dark:text-amber-400 text-xs font-semibold px-2 py-1 rounded-full border border-amber-500/20 font-sans">En attente</span>
                      ) : abs.etat === 'JUSTIFIEE' ? (
                        <span className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-xs font-semibold px-2 py-1 rounded-full border border-emerald-500/20 font-sans">Justifiée</span>
                      ) : (
                        <span className="bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded-full border border-red-500/20 font-sans">Non justifiée</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenModal(abs)}
                          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-600"
                          title="Détails"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {absencesPage && absencesPage.total > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Affichage {(absencesPage.page - 1) * absencesPage.limit + 1} à {Math.min(absencesPage.page * absencesPage.limit, absencesPage.total)} sur {absencesPage.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={absencesPage.page <= 1}
                onClick={() => {
                  setPage(absencesPage.page - 1);
                  setSelectedAbsences(new Set());
                }}
                className="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={absencesPage.page >= absencesPage.totalPages}
                onClick={() => {
                  setPage(absencesPage.page + 1);
                  setSelectedAbsences(new Set());
                }}
                className="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Détail et Traitement */}
      <Modal isOpen={!!selectedAbsence} onClose={() => setSelectedAbsence(null)} title="Détail et Traitement">
         {selectedAbsence && (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-xl">
                 <div>
                   <p className="text-gray-500 dark:text-slate-400 mb-1">Élève</p>
                   <p className="font-medium text-gray-900 dark:text-slate-100">{selectedAbsence.eleve?.nom} {selectedAbsence.eleve?.prenom}</p>
                   <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{selectedAbsence.eleve?.codeMassar}</p>
                 </div>
                 <div>
                   <p className="text-gray-500 dark:text-slate-400 mb-1">Date</p>
                   <p className="font-medium text-gray-900 dark:text-slate-100">{typeof selectedAbsence.date === 'string' ? selectedAbsence.date.slice(0,10) : selectedAbsence.date} ({selectedAbsence.heureDebut}-{selectedAbsence.heureFin})</p>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Motif (Optionnel si l'absence est non justifiée)</label>
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
                  rows={3}
                  placeholder="Ex: Certificat médical apporté le..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between">
                 <Button variant="outline" onClick={() => setSelectedAbsence(null)}>Fermer</Button>
                 <div className="flex gap-2">
                    <Button 
                      className="bg-red-600 hover:bg-red-700 text-white" 
                      loading={isUpdating}
                      disabled={false} 
                      onClick={() => handleUpdateEtat('NON_JUSTIFIEE')}
                    >
                       <XIcon size={18} className="mr-2 inline" /> Def. Non Justifiée
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                      loading={isUpdating}
                      disabled={!motif.trim()}
                      onClick={() => handleUpdateEtat('JUSTIFIEE')}
                    >
                       <CheckIcon size={18} className="mr-2 inline" /> Valider Justifiée
                    </Button>
                 </div>
              </div>
           </div>
         )}
      </Modal>

      {/* Modal Export */}
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Exporter les absences">
         <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Date début</label>
                 <Input type="date" value={exportFilters.dateDebut || ''} onChange={e => setExportFilters(f => ({ ...f, dateDebut: e.target.value }))} />
               </div>
               <div>
                 <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Date fin (inclus)</label>
                 <Input type="date" value={exportFilters.dateFin || ''} onChange={e => setExportFilters(f => ({ ...f, dateFin: e.target.value }))} />
               </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Classe</label>
              <Select 
                value={exportFilters.classeId || ''} 
                onChange={e => setExportFilters(f => ({ ...f, classeId: e.target.value || undefined, eleveId: undefined }))}
                options={[
                  { value: '', label: 'Toutes les classes' },
                  ...classesList.map((c: any) => ({ value: c.id, label: `${c.niveau}-${c.numero}` }))
                ]}
              />
            </div>

            {exportFilters.classeId && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Élève</label>
                <Select 
                  value={exportFilters.eleveId || ''} 
                  onChange={e => setExportFilters(f => ({ ...f, eleveId: e.target.value || undefined }))}
                  options={[
                    { value: '', label: 'Tous les élèves' },
                    ...elevesList.filter((e: any) => e.classeId === exportFilters.classeId).map((e: any) => ({ value: e.id, label: `${e.nom} ${e.prenom}` }))
                  ]}
                />
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2">
               <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Annuler</Button>
               <Button onClick={executeExport} loading={isExporting} className="bg-blue-600 hover:bg-blue-700 text-white">
                 <DownloadIcon size={18} className="mr-2 inline" /> Lancer l'export
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default CadreAbsences;
