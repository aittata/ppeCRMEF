// frontend/src/features/absences/pages/MesAbsences.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAbsences, useCreateAbsence, useRemoveAbsence } from '../hooks/useAbsences';
import { useSeances } from '@/features/seances/hooks/useSeances';
import { client } from '@/shared/api/client';
import { Absence, EtatAbsence, FilterAbsence, Eleve, ETAT_LABELS } from '@/shared/types';
import { useAuthStore } from '@/shared/store/auth.store';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { PlusIcon, DownloadIcon, TrashIcon, CalendarIcon, UsersIcon } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

const daysOfWeekMapping = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
const getJourSemaineFromDateStr = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return daysOfWeekMapping[d.getDay()];
};

const MesAbsences: React.FC = () => {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [baseFilters, setBaseFilters] = useState<Partial<FilterAbsence>>({});
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  const filters: FilterAbsence = useMemo(() => {
    return {
      ...baseFilters,
      page,
      limit: 50
    };
  }, [page, baseFilters]);

  const { data: absencesPage, isLoading } = useAbsences(filters);

  const { data: datesLookupPage } = useAbsences({ limit: 1000, classeId: baseFilters.classeId });

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
    setBaseFilters(prev => ({
      ...prev,
      dateDebut: val || undefined,
      dateFin: val || undefined
    }));
  };

  const { mutate: removeAbsence, isPending: isRemoving } = useRemoveAbsence();
  const { mutateAsync: createAbsence } = useCreateAbsence();
  const toast = useToast();

  const availableDates = useMemo(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dates = [new Date(), new Date()];
    dates[1].setDate(dates[0].getDate() - 1);
    
    return dates.map(d => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = days[d.getDay()];
      const label = `${dayName}, Le ${dd}/${mm}/${yyyy}.`;
      const isSunday = d.getDay() === 0;
      
      return { dateStr, label, isSunday };
    }).filter(opt => !opt.isSunday);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [absenceToDeleteId, setAbsenceToDeleteId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSeanceId, setSelectedSeanceId] = useState('');
  const [date, setDate] = useState(() => {
    return availableDates[0]?.dateStr || new Date().toISOString().slice(0, 10);
  });
  
  const { useFindByEnseignant } = useSeances();
  const { data: mySeances, isLoading: isLoadingSeances } = useFindByEnseignant(user?.id || '', true);
  
  const filteredSeances = useMemo(() => {
    if (!mySeances || !date) return [];
    const jourSemaineStr = getJourSemaineFromDateStr(date);
    return mySeances.filter(s => s.jourSemaine === jourSemaineStr);
  }, [mySeances, date]);

  useEffect(() => {
    if (selectedSeanceId) {
      const exists = filteredSeances.some(s => s.id === selectedSeanceId);
      if (!exists) {
        setSelectedSeanceId('');
      }
    }
  }, [date, filteredSeances, selectedSeanceId]);
  
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [isLoadingEleves, setIsLoadingEleves] = useState(false);
  const [selectedEleves, setSelectedEleves] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const myClasses = useMemo(() => {
    if (!mySeances) return [];
    const map = new Map<string, any>();
    mySeances.forEach(s => {
      if (s.classe) map.set(s.classe.id, s.classe);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.niveau === b.niveau) return a.numero - b.numero;
      return a.niveau.localeCompare(b.niveau);
    });
  }, [mySeances]);
  
  const absences = (absencesPage?.data || []) as Absence[];

  const handleNextStep = async () => {
    if (!selectedSeanceId || !date) return toast.error('Veuillez sélectionner une séance et une date');
    const seance = mySeances?.find(s => s.id === selectedSeanceId);
    if (!seance) return;
    
    setIsLoadingEleves(true);
    try {
      const [elevesRes, absencesRes] = await Promise.all([
        client.get(`/eleves`, { params: { classeId: seance.classeId, actif: true } }),
        client.get(`/absences`, {
          params: {
            classeId: seance.classeId,
            dateDebut: date,
            dateFin: date,
            limit: 200,
          },
        }),
      ]);

      const rawEleves: Eleve[] = elevesRes.data || [];
      const existingAbsences: Absence[] = absencesRes.data || [];

      // Filtrer les élèves qui possèdent déjà une absence enregistrée pour ce créneau horaire à cette date
      const absentEleveIds = new Set(
        existingAbsences
          .filter(abs => abs.heureDebut === seance.heureDebut)
          .map(abs => abs.eleveId)
      );

      const filteredEleves = rawEleves.filter(e => !absentEleveIds.has(e.id));
      setEleves(filteredEleves);
      setStep(2);
    } catch (e) {
      toast.error('Erreur lors du chargement des élèves');
    } finally {
      setIsLoadingEleves(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedEleves.size === 0) return toast.error('Sélectionnez au moins un élève');
    setIsSubmitting(true);
    try {
      await Promise.all(
        Array.from(selectedEleves).map(eleveId => 
          createAbsence({ eleveId, date, seanceId: selectedSeanceId })
        )
      );
      toast.success(`${selectedEleves.size} absence(s) enregistrée(s) avec succès`);
      setIsModalOpen(false);
      resetForm();
    } catch (e: any) {
      // the hook will toast internally if error, but we catch it to stop flow.
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedSeanceId('');
    setSelectedEleves(new Set());
    setDate(availableDates[0]?.dateStr || new Date().toISOString().slice(0, 10));
  };

  const selectedSeance = mySeances?.find(s => s.id === selectedSeanceId);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/50 dark:bg-slate-900/50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Saisie des Absences</h1>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusIcon size={18} className="mr-2" /> Saisir Absence
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="w-full sm:w-64">
            <Select 
              value={baseFilters.classeId || ''} 
              onChange={e => {
                const newClassId = e.target.value || undefined;
                setPage(1);
                setSelectedDateFilter('');
                setBaseFilters({
                  classeId: newClassId,
                  dateDebut: undefined,
                  dateFin: undefined
                });
              }}
               options={[
                { value: '', label: 'Toutes mes classes' },
                ...myClasses.map((c: any) => ({ value: c.id, label: `${c.niveau}-${c.numero}` }))
              ]}
              className="mt-0"
            />
          </div>

          <div className="w-full sm:w-64">
            <Select 
              value={selectedDateFilter || ''} 
              onChange={e => handleDateFilterChange(e.target.value)}
              options={[
                { value: '', label: 'Toutes les dates' },
                ...uniqueDates.map(dStr => {
                  const [yyyy, mm, dd] = dStr.split('-');
                  return { value: dStr, label: `${dd}/${mm}/${yyyy}` };
                })
              ]}
              className="mt-0"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : absences.length === 0 ? (
          <EmptyState title="Aucune absence saisie pour le moment." icon={<CalendarIcon className="text-gray-400 dark:text-slate-400" />} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 shadow-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Créneau</th>
                  <th className="px-6 py-4 font-medium">Élève</th>
                  <th className="px-6 py-4 font-medium">Classe</th>
                  <th className="px-6 py-4 font-medium">État</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {absences.map((abs) => (
                  <tr key={abs.id} className="hover:bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                       <span className="block font-medium text-gray-900 dark:text-slate-100">{typeof abs.date === 'string' ? abs.date.slice(0,10) : abs.date}</span>
                       <span className="text-xs text-gray-500 dark:text-slate-400">{abs.heureDebut} - {abs.heureFin}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-slate-100">
                      {abs.eleve?.nom} {abs.eleve?.prenom}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {abs.classe?.niveau}-{abs.classe?.numero}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                        ${abs.etat === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700 dark:text-amber-200' :
                          abs.etat === 'JUSTIFIEE' ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-200' :
                          'bg-red-100 text-red-700 dark:text-red-200'}`}
                      >
                        {ETAT_LABELS[abs.etat as EtatAbsence]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button 
                         size="sm" 
                         variant="ghost" 
                         className="text-red-500 hover:text-red-700 dark:text-red-200 hover:bg-red-50 dark:bg-red-900/20"
                         disabled={abs.etat !== 'EN_ATTENTE' || isRemoving}
                         onClick={() => setAbsenceToDeleteId(abs.id)}
                       >
                         <TrashIcon size={16} />
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && absences.length >= 50 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setPage(r => r + 1)} className="text-blue-600 bg-white dark:bg-slate-800">
              <PlusIcon size={16} className="mr-2" />
              Page suivante
            </Button>
          </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Saisie d'Absences">
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Étape 1 sur 2 : Sélection de la séance</p>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Date de la séance *
              </label>
              <div className="flex flex-wrap gap-3">
                {availableDates.map(opt => (
                  <button
                    key={opt.dateStr}
                    type="button"
                    onClick={() => setDate(opt.dateStr)}
                    className={`flex-1 min-w-[180px] text-center border p-3 rounded-lg font-medium transition-all ${
                      date === opt.dateStr 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 text-gray-800 dark:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Select 
              label="Ma séance"
              value={selectedSeanceId}
              onChange={e => setSelectedSeanceId(e.target.value)}
              required
              options={[
                { value: '', label: 'Choisir une séance...' },
                ...filteredSeances.map((s: any) => ({
                  value: s.id,
                  label: `${s.jourSemaine} ${s.heureDebut}-${s.heureFin} • ${s.classe?.niveau}-${s.classe?.numero}`
                }))
              ]}
            />

            {selectedSeance && (
               <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3 mt-4">
                 <UsersIcon className="text-blue-600 mt-1" />
                 <div>
                   <p className="font-semibold text-blue-900">Détails</p>
                   <p className="text-sm text-blue-800">Classe : {selectedSeance.classe?.niveau}-{selectedSeance.classe?.numero}</p>
                   <p className="text-sm text-blue-800">Matière : {selectedSeance.matiere}</p>
                 </div>
               </div>
            )}

            <div className="flex justify-end pt-4 mt-8 border-t">
              <Button onClick={handleNextStep} disabled={!selectedSeanceId || !date}>Suivant</Button>
            </div>
          </div>
        )}

        {step === 2 && selectedSeance && (
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-500 dark:text-slate-400">Étape 2 sur 2 : Cochage des absents</p>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Retour</Button>
             </div>

             <div className="bg-gray-50/50 dark:bg-slate-900/50 p-3 rounded-lg text-sm text-gray-700 dark:text-slate-300 mb-4 font-medium flex justify-between">
                <span>{selectedSeance.classe?.niveau}-{selectedSeance.classe?.numero}</span>
                <span>{date} ({selectedSeance.heureDebut}-{selectedSeance.heureFin})</span>
             </div>

             {isLoadingEleves ? (
                <div className="flex justify-center p-8"><Spinner /></div>
             ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {eleves.map(e => (
                    <label key={e.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedEleves.has(e.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'hover:bg-gray-50/50 dark:bg-slate-900/50'}`}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={selectedEleves.has(e.id)}
                        onChange={(ev) => {
                          const next = new Set(selectedEleves);
                          if (ev.target.checked) next.add(e.id);
                          else next.delete(e.id);
                          setSelectedEleves(next);
                        }}
                      />
                      <div className="ml-3">
                         <span className="block font-medium text-gray-900 dark:text-slate-100">{e.nom} {e.prenom}</span>
                         <span className="block text-xs text-gray-500 dark:text-slate-400">{e.codeMassar}</span>
                      </div>
                    </label>
                  ))}
                  {eleves.length === 0 && <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">Aucun élève trouvé dans cette classe.</p>}
                </div>
             )}

             <div className="flex justify-between items-center pt-4 mt-6 border-t">
                <span className="text-sm font-medium text-gray-600">{selectedEleves.size} sélectionné(s)</span>
                <Button onClick={handleSubmit} loading={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={selectedEleves.size === 0}>
                   Enregistrer
                </Button>
             </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!absenceToDeleteId}
        onClose={() => setAbsenceToDeleteId(null)}
        onConfirm={() => {
          if (absenceToDeleteId) {
            removeAbsence(absenceToDeleteId);
          }
        }}
        title="Supprimer l'absence"
        message="Êtes-vous sûr de vouloir supprimer cette absence ? Cette action est irréversible."
        confirmLabel="Supprimer"
        confirmVariant="danger"
      />

    </div>
  );
};

export default MesAbsences;
