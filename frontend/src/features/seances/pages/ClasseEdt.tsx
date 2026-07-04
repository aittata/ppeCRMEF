// frontend/src/features/seances/pages/ClasseEdt.tsx
import React, { useState } from 'react';
import { useSeances } from '../hooks/useSeances';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { JOURS_SEMAINE, Seance, CreateSeancePayload, JourSemaine, MATIERES } from '@/shared/types';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isAxiosError } from 'axios';

const ClasseEdt: React.FC = () => {
  const [selectedNiveau, setSelectedNiveau] = useState<string>('');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  
  const { useFindByClasse, create, update, remove, isCreating, isUpdating, isRemoving } = useSeances();
  const { data: userData } = useUsers();
  const enseignants = Array.isArray(userData) ? userData.filter((u: any) => u.role === 'ENSEIGNANT' && u.actif) : (userData?.data || []).filter((u: any) => u.role === 'ENSEIGNANT' && u.actif);
  
  const { data: classesData = [], isLoading: isLoadingClasses } = useClasses({ actif: true });
  const allClasses = Array.isArray(classesData) ? classesData : (classesData as any)?.data || [];

  const niveauxUniques = Array.from(new Set(allClasses.map((c: any) => c.niveau).filter(Boolean)));
  const classes = selectedNiveau 
    ? allClasses.filter((c: any) => c.niveau === selectedNiveau) 
    : allClasses;

  const { data: seances, isLoading: isLoadingSeances } = useFindByClasse(selectedClasseId, true);

  const horaires = ['08:30', '09:30', '10:30', '11:30', '12:30', '14:30', '15:30', '16:30', '17:30'];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seanceToDelete, setSeanceToDelete] = useState<string | null>(null);
  const [editingSeance, setEditingSeance] = useState<Seance | null>(null);
  const [conflictData, setConflictData] = useState<any>(null);
  const [apiError, setApiError] = useState<string>('');

  const [formData, setFormData] = useState<Omit<CreateSeancePayload, 'salle'> & { salle: number | '' }>({
    enseignantId: '',
    classeId: '',
    matiere: '',
    jourSemaine: 'LUNDI',
    heureDebut: '08:30',
    heureFin: '09:30',
    salle: ''
  });

  const handleOpenModal = (seance?: Seance) => {
    setApiError('');
    if (seance) {
      setEditingSeance(seance);
      setFormData({
        enseignantId: seance.enseignantId,
        classeId: seance.classeId,
        matiere: seance.matiere,
        jourSemaine: seance.jourSemaine,
        heureDebut: seance.heureDebut,
        heureFin: seance.heureFin,
        salle: seance.salle || ''
      });
    } else {
      setEditingSeance(null);
      setFormData({
        enseignantId: enseignants[0]?.id || '',
        classeId: selectedClasseId || (allClasses[0]?.id || ''),
        matiere: enseignants[0]?.matiere || '',
        jourSemaine: 'LUNDI',
        heureDebut: '08:30',
        heureFin: '09:30',
        salle: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setApiError('');
    setEditingSeance(null);
    setConflictData(null);
  };

  const handleConflictResolve = async (action: 'force' | 'keep') => {
      setApiError('');
      try {
        const payload = { 
            ...formData, 
            salle: formData.salle === '' ? undefined : formData.salle,
            forceChangeTeacher: action === 'force', 
            keepExistingTeacher: action === 'keep' 
        };
        if (editingSeance) {
          await update({ id: editingSeance.id, data: payload as any });
        } else {
          await create(payload as any);
        }
        setConflictData(null);
        handleCloseModal();
      } catch (err) {
        if (isAxiosError(err) && (err.response?.data?.message || err.response?.data?.error)) {
            const msg = err.response.data.message || err.response.data.error;
            setApiError(typeof msg === 'string' ? msg : msg.message);
        } else {
            setApiError('Une erreur inattendue est survenue.');
        }
        setConflictData(null);
      }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');
    try {
      const payload = { ...formData, salle: formData.salle === '' ? undefined : formData.salle };
      if (editingSeance) {
        await update({ id: editingSeance.id, data: payload });
      } else {
        await create(payload as CreateSeancePayload);
      }
      handleCloseModal();
    } catch (err) {
      if (isAxiosError(err)) {
          const respData = err.response?.data;
          const details = respData?.details;
          if (details?.code === 'TEACHER_CONFLICT' || respData?.code === 'TEACHER_CONFLICT') {
             setConflictData(details || respData);
          } else {
             const msg = respData?.error || respData?.message;
             setApiError(typeof msg === 'string' ? msg : msg?.message || 'Erreur inconnue');
          }
      } else {
        setApiError('Une erreur inattendue est survenue.');
      }
    }
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    setSeanceToDelete(id);
  };

  const confirmDelete = async () => {
    if (!seanceToDelete) return;
    try {
      await remove(seanceToDelete);
    } catch (err) {
      // already handled in useSeances via toast
    } finally {
      setSeanceToDelete(null);
    }
  };

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

  return (
    <div className="flex flex-col md:h-full p-4 md:p-8 space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Emplois du Temps (Par classes)</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {isLoadingClasses ? (
            <Spinner size="sm" />
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  value={selectedNiveau}
                  onChange={(e) => {
                      setSelectedNiveau(e.target.value);
                      if (selectedClasseId) {
                          const classeSel = allClasses.find((c: any) => c.id === selectedClasseId);
                          if (classeSel && e.target.value && classeSel.niveau !== e.target.value) {
                              setSelectedClasseId('');
                          }
                      }
                  }}
                  className="w-full"
                  options={[
                      { value: '', label: '-- Tous les niveaux --' },
                      ...niveauxUniques.map((n: any) => ({ value: String(n), label: String(n) }))
                  ]}
                />
              </div>
              <div className="w-full sm:w-64">
                <Select
                  value={selectedClasseId}
                  onChange={(e) => setSelectedClasseId(e.target.value)}
                  className="w-full"
                  options={[
                      { value: '', label: '-- Choisir une classe --' },
                      ...classes.map((c: any) => ({ value: c.id, label: `${c.niveau}-${c.numero}` }))
                  ]}
                />
              </div>
            </div>
          )}
          <div className="w-full sm:w-auto shrink-0">
            <Button onClick={() => handleOpenModal()} disabled={!selectedClasseId} className="w-full sm:w-auto">
               <Plus size={18} className="mr-2 inline" /> Ajouter
            </Button>
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
                                <div key={s.id} onClick={() => handleOpenModal(s)} className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <div className="text-base font-bold text-blue-950 dark:text-blue-50 leading-tight">{s.matiere}</div>
                                        <button onClick={(e) => handleRemove(e, s.id)} className="text-red-500 hover:text-red-700 dark:text-red-200 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm shrink-0 ml-2"><Trash2 size={14}/></button>
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
                                onClick={() => handleOpenModal(s)}
                                className="absolute left-1 right-1 p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-sm hover:shadow-md hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors z-10 cursor-pointer group flex flex-col gap-1 overflow-y-auto card-scrollbar"
                              >
                                <div className="flex justify-between items-start gap-1 pb-1 border-b border-blue-200/30 dark:border-blue-900/30 shrink-0">
                                    <div className="text-xs font-bold text-blue-950 dark:text-blue-50 leading-tight break-words line-clamp-2" title={s.matiere}>{s.matiere}</div>
                                    <button onClick={(e) => handleRemove(e, s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm shrink-0" title="Supprimer">
                                        <Trash2 size={10}/>
                                    </button>
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
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSeance ? "Modifier la séance" : "Ajouter une séance"}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {apiError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-200 px-4 py-3 rounded-md text-sm">
                  {apiError}
                </div>
              )}
              
              <Select 
                label="Matière" 
                value={formData.matiere} 
                onChange={(e) => {
                  setFormData({...formData, matiere: e.target.value, enseignantId: ''});
                }} 
                required
                options={[
                   { value: '', label: 'Sélectionnez une matière' },
                   ...MATIERES.map((m) => ({ value: m, label: m }))
                ]}
              />

              <Select 
                label="Enseignant" 
                value={formData.enseignantId} 
                onChange={(e) => setFormData({...formData, enseignantId: e.target.value})} 
                required
                disabled={!formData.matiere}
                options={[
                   { value: '', label: 'Sélectionnez un enseignant' },
                   ...enseignants.filter((ens: any) => {
                     if (!formData.matiere) return true;
                     const mat = formData.matiere;
                     const matEns = ens.matiere;
                     if (mat === 'Mathématiques' || mat === 'Physiques et Chimie') {
                       return matEns === 'Mathématiques' || matEns === 'Physiques et Chimie';
                     }
                     return matEns === mat;
                   }).map((ens: any) => ({ value: ens.id, label: `${ens.prenom} ${ens.nom} (${ens.matiere || 'N/A'})` }))
                ]}
              />

              {!selectedClasseId && ( // Only if we came broadly
                <Select 
                    label="Classe" 
                    value={formData.classeId} 
                    onChange={(e) => setFormData({...formData, classeId: e.target.value})} 
                    required
                    options={[
                    { value: '', label: 'Sélectionnez une classe' },
                    ...allClasses.map((c: any) => ({ value: c.id, label: `${c.niveau}-${c.numero}` }))
                    ]}
                />
              )}

              <Select 
                label="Jour" 
                value={formData.jourSemaine} 
                onChange={(e) => setFormData({...formData, jourSemaine: e.target.value as JourSemaine})} 
                required
                options={JOURS_SEMAINE.map(j => ({ value: j, label: j }))}
              />

              <div className="grid grid-cols-2 gap-4">
                  <Input label="Heure début (HH:MM)" type="time" required value={formData.heureDebut} onChange={e => setFormData({...formData, heureDebut: e.target.value})} />
                  <Input label="Heure fin (HH:MM)" type="time" required value={formData.heureFin} onChange={e => setFormData({...formData, heureFin: e.target.value})} />
              </div>

              <Input 
                label="Salle" 
                required
                type="number" 
                min="1" 
                max="50" 
                value={formData.salle || ''} 
                onChange={e => setFormData({...formData, salle: parseInt(e.target.value) || ''})} 
                placeholder="Ex: 12" 
              />

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Annuler</Button>
                <Button type="submit" loading={isCreating || isUpdating}>Enregistrer</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!seanceToDelete}
        onClose={() => setSeanceToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer la séance"
        message="Voulez-vous vraiment désactiver cette séance ?"
        confirmLabel={isRemoving ? "Suppression..." : "Supprimer"}
        confirmVariant="danger"
      />

      <AnimatePresence>
        {conflictData && (
          <Modal isOpen={true} onClose={() => setConflictData(null)} title="Conflit d'Enseignant">
            <div className="space-y-4">
               <p className="text-gray-700 dark:text-gray-300">
                 {conflictData.message}
               </p>
               <p className="text-sm text-gray-500 dark:text-gray-400">
                 Comment voulez-vous résoudre ceci ?
               </p>
               <div className="flex flex-col gap-3 mt-6">
                 <Button onClick={() => handleConflictResolve('force')} loading={isCreating || isUpdating} className="w-full">
                     Changer toutes les autres séances vers le nouvel enseignant
                 </Button>
                 <Button onClick={() => handleConflictResolve('keep')} variant="outline" loading={isCreating || isUpdating} className="w-full text-left justify-start">
                     Assigner cette séance à l'enseignant courant ({conflictData.currentTeacherName})
                 </Button>
                 <Button onClick={() => setConflictData(null)} variant="ghost" className="w-full text-gray-500">
                     Annuler
                 </Button>
               </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClasseEdt;
