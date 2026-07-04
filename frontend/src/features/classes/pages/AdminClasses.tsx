// frontend/src/features/classes/pages/AdminClasses.tsx
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useClasses, useCreateClasse, useUpdateClasse } from '../hooks/useClasses';
import { Classe, NiveauClasse } from '@/shared/types';
import { Plus, X, Power } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export default function AdminClasses() {
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; classeId: string; action: 'deactivate' | 'reactivate' } | null>(null);
  
  const [filters, setFilters] = useState<{ actif?: boolean, niveau?: string }>({});
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  const { data: allClasses } = useClasses();
  const { data: classes, isLoading } = useClasses(filters);
  const createMutation = useCreateClasse();
  const updateMutation = useUpdateClasse();

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    await updateMutation.mutateAsync({
      id: confirmDialog.classeId,
      payload: { actif: confirmDialog.action === 'reactivate' }
    });
    setConfirmDialog(null);
  };

  const toggleSelection = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedClasses);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedClasses(next);
  };

  const handleBulkToggle = (active: boolean) => {
    selectedClasses.forEach(id => {
      const cls = classes?.find(c => c.id === id);
      if (cls && cls.actif !== active) {
        updateMutation.mutate({ id, payload: { actif: active } });
      }
    });
    setSelectedClasses(new Set());
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Gestion des Classes</h1>
            {selectedClasses.size > 0 && (
              <div className="flex bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
                <button
                  onClick={() => handleBulkToggle(true)}
                  className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium transition-colors"
                >
                  Activer
                </button>
                <div className="w-px bg-gray-200 dark:border-slate-700"></div>
                <button
                  onClick={() => handleBulkToggle(false)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
                >
                  Désactiver
                </button>
              </div>
            )}
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ajouter une classe
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 flex flex-wrap gap-4 items-center">
        <select
          className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
          value={filters.niveau || ''}
          onChange={e => setFilters(f => ({ ...f, niveau: e.target.value || undefined }))}
        >
          <option value="">Tous les niveaux</option>
          <option value="1AC">1AC</option>
          <option value="2AC">2AC</option>
          <option value="3AC">3AC</option>
        </select>

        <select
          className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
          value={filters.actif === undefined ? '' : filters.actif.toString()}
          onChange={e => {
            const val = e.target.value;
            setFilters(f => ({ ...f, actif: val === '' ? undefined : val === 'true' }));
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actives</option>
          <option value="false">Inactives</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {classes?.map(classe => (
              <ClasseCard
                key={classe.id}
                classe={classe}
                selected={selectedClasses.has(classe.id)}
                onToggleSelection={toggleSelection}
                setConfirmDialog={setConfirmDialog}
                onUpdate={(payload) => updateMutation.mutate({ id: classe.id, payload })}
                isUpdating={updateMutation.isPending && updateMutation.variables?.id === classe.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <AddClasseModal
            onClose={() => setIsAdding(false)}
            onSubmit={(payload) => {
              createMutation.mutate(payload, { onSuccess: () => setIsAdding(false) });
            }}
            isLoading={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {confirmDialog?.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={() => setConfirmDialog(null)} 
              />
              <motion.div
                key="confirm-dialog-classes"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 z-10"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Confirmer l'action</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-6 font-normal">
                  Êtes-vous sûr de vouloir {confirmDialog.action === 'deactivate' ? 'désactiver' : 'réactiver'} cette classe ?
                </p>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setConfirmDialog(null)}>Annuler</Button>
                  <Button 
                    type="button" 
                    onClick={handleConfirmAction} 
                    className={confirmDialog.action === 'deactivate' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} 
                    loading={updateMutation.isPending}
                  >
                    Confirmer
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function AddClasseModal({ 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  onClose: () => void; 
  onSubmit: (payload: any) => void;
  isLoading: boolean;
}) {
  const [niveau, setNiveau] = useState<NiveauClasse>('1AC');
  const [numero, setNumero] = useState(1);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Nouvelle classe
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ niveau, numero, actif: true });
        }} className="p-4 flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Niveau</label>
              <select
                value={niveau}
                onChange={e => setNiveau(e.target.value as NiveauClasse)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                required
              >
                <option value="1AC">1AC</option>
                <option value="2AC">2AC</option>
                <option value="3AC">3AC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Numéro (1-49)</label>
              <input
                type="number"
                min="1"
                max="49"
                value={numero}
                onChange={e => setNumero(parseInt(e.target.value, 10))}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-6 md:sticky md:bottom-0 md:bg-white dark:bg-slate-800 md:pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

function ClasseCard({ 
  classe, 
  selected, 
  onToggleSelection, 
  setConfirmDialog, 
  onUpdate, 
  isUpdating 
}: { 
  classe: Classe; 
  selected: boolean; 
  onToggleSelection: (e: React.MouseEvent | React.ChangeEvent, id: string) => void;
  setConfirmDialog: (dialog: any) => void;
  onUpdate: (payload: any) => void;
  isUpdating: boolean;
}) {
  const initialY = classe.niveau ? classe.niveau.replace('AC', '') : '1';
  const initialX = classe.numero ? classe.numero.toString() : '1';

  const [y, setY] = useState(initialY);
  const [x, setX] = useState(initialX);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setY(classe.niveau ? classe.niveau.replace('AC', '') : '1');
    setX(classe.numero ? classe.numero.toString() : '1');
    setIsEditing(false);
  }, [classe.niveau, classe.numero]);

  const isChanged = y !== initialY || x !== initialX;
  const numX = parseInt(x);
  const isValid = ['1', '2', '3'].includes(y) && !isNaN(numX) && numX >= 1 && numX <= 49;

  const handleSave = () => {
    if (isValid && !isUpdating) {
      onUpdate({ niveau: `${y}AC`, numero: numX });
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-white dark:bg-slate-800 border ${isChanged ? 'border-blue-400 dark:border-blue-500 shadow-md ring-1 ring-blue-400/50' : 'border-gray-200 dark:border-slate-700'} rounded-lg p-5 flex flex-col relative overflow-hidden transition-all duration-300`}
    >
      {!classe.actif && (
        <div className="absolute top-0 right-0 bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-bl-lg border-b border-l border-red-500/20 z-10">
          Inactive
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelection(e, classe.id)}
            className="mt-2 shrink-0 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xl font-bold text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                  title="Cliquer pour modifier"
                >
                  {initialY}AC - {initialX}
                </button>
              ) : (
                <>
                  <select 
                    value={y} 
                    onChange={(e) => setY(e.target.value)}
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-1.5 py-1 text-lg font-bold text-gray-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-12 text-center transition-all"
                    autoFocus
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">AC -</span>
                  <input 
                    type="number"
                    min="1"
                    max="49"
                    value={x}
                    onChange={(e) => setX(e.target.value)}
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-1.5 py-1 text-lg font-bold text-gray-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-16 text-center transition-all"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditing(false);
                      setY(initialY);
                      setX(initialX);
                    }} 
                    className="ml-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800" 
                    title="Annuler"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            
            <AnimatePresence>
              {isEditing && isChanged && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <Button 
                    onClick={handleSave} 
                    disabled={!isValid || isUpdating} 
                    loading={isUpdating}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                  >
                    Enregistrer
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={() => setConfirmDialog({ isOpen: true, classeId: classe.id, action: classe.actif ? 'deactivate' : 'reactivate' })}
            className={`p-1.5 rounded transition-colors ${
              classe.actif 
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' 
                : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
            title={classe.actif ? 'Désactiver' : 'Activer'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center text-sm">
        <span className="text-gray-500 dark:text-slate-400">Total élèves</span>
        <span className="font-medium text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900 px-2.5 py-1 rounded-md">
          {(classe as any).totalEleves ?? '?'}
        </span>
      </div>
    </motion.div>
  );
}
