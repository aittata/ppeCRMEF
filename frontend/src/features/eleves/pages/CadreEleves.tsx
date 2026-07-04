// frontend/src/features/eleves/pages/CadreEleves.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { elevesApi } from '../eleves.api';
import { queryClient } from '@/shared/api/queryClient';
import { useEleves, useCreateEleve, useUpdateEleve } from '../hooks/useEleves';
import { useClasses } from '../../classes/hooks/useClasses';
import type { Eleve, FilterEleve } from '@/shared/types';
import { 
  Plus, Pencil, X, Search, ChevronLeft, ChevronRight, Power, 
  Upload, FileDown, CheckCircle, AlertTriangle, AlertCircle
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export default function CadreEleves() {
  const [showModal, setShowModal] = useState(false);
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [selectedEleves, setSelectedEleves] = useState<Set<string>>(new Set());
  const [selectedClasseForBulk, setSelectedClasseForBulk] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; eleveId: string; action: 'deactivate' | 'reactivate' } | null>(null);
  
  const [filters, setFilters] = useState<FilterEleve>({ page: 1, limit: 50 });
  const [searchInput, setSearchInput] = useState('');

  // Bulk Import state variables
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    isOpen: boolean;
    total: number;
    successCount: number;
    errorCount: number;
    errorsList: any[];
  } | null>(null);
  const [headerErrorDialog, setHeaderErrorDialog] = useState<string | null>(null);

  const { data: pageData, isLoading } = useEleves(filters);
  const { data: classes } = useClasses({ actif: true });
  
    
  const createMutation = useCreateEleve();
  const updateMutation = useUpdateEleve();

  // Excel utilities and processing
  const handleDownloadCanevas = () => {
    const headers = ['Code Massar', 'Nom', 'Prénom', 'Date de naissance (JJ/MM/AAAA)', 'Niveau (1AC, 2AC ou 3AC)', 'Numéro (1, 2, ...)'];
    // Setting up the worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Set cell formatting to Text (@) for the first 200 rows by 6 columns
    for (let r = 0; r < 200; r++) {
      for (let c = 0; c < 6; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) {
          ws[cellRef] = { t: 's', v: '' };
        }
        ws[cellRef].z = '@';
      }
    }

    // Set column widths in SheetJS
    ws['!cols'] = headers.map(header => ({
      wch: Math.min(Math.max(header.length + 4, 12), 52)
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canevas_importation_eleves.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (typeof val === 'string') {
      const cleaned = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
      }
      const parts = cleaned.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        if (parts[2].length === 4) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        }
      }
    }
    return String(val).trim();
  };

  const handleImportExcel = async () => {
    if (!importingFile) return;
    setIsImporting(true);

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          setIsImporting(false);
          return;
        }
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length < 2) {
          setHeaderErrorDialog("Le fichier Excel est vide ou ne contient que la ligne d'en-tête.");
          setIsImporting(false);
          return;
        }

        const headers = (rows[0] as any[]).map((h: any) => String(h || '').trim());
        const expectedHeaders = [
          'Code Massar',
          'Nom',
          'Prénom',
          'Date de naissance (JJ/MM/AAAA)',
          'Niveau (1AC, 2AC ou 3AC)',
          'Numéro (1, 2, ...)'
        ];
        const hasProperHeaders = expectedHeaders.length <= headers.length && expectedHeaders.every((h, i) => headers[i] === h);
        
        if (!hasProperHeaders) {
          setHeaderErrorDialog("Le format des en-têtes du fichier ne correspond pas au canevas. Veuillez utiliser le canevas téléchargé sans modifier ses en-têtes.\n\nEn-têtes attendus:\n" + expectedHeaders.join(', '));
          setIsImporting(false);
          return;
        }

        // Pull active list to check duplicates
        const currentRes = await elevesApi.findAll({ limit: 10000 }) as any;
        const existingMassars = new Set(
          (currentRes?.data || []).map((el: any) => el.codeMassar.toUpperCase().trim())
        );

        const successes: any[] = [];
        const errors: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue; // Skip layout padding lines
          }

          const rawCodeMassar = row[0];
          const rawNom = row[1];
          const rawPrenom = row[2];
          const rawBirthDate = row[3];
          const rawNiveau = row[4];
          const rawClasse = row[5];

          const codeMassar = String(rawCodeMassar || '').trim();
          const nom = String(rawNom || '').trim();
          const prenom = String(rawPrenom || '').trim();
          const birthDateStr = parseExcelDate(rawBirthDate);
          const inputNiveau = rawNiveau ? String(rawNiveau).trim() : '';
          const inputClasse = rawClasse ? String(rawClasse).trim() : '';

          const rowErrors: string[] = [];

          if (!codeMassar) {
            rowErrors.push('Code Massar est obligatoire.');
          }
          if (!nom) {
            rowErrors.push('Nom est obligatoire.');
          }
          if (!prenom) {
            rowErrors.push('Prénom est obligatoire.');
          }

          const isValidDate = (str: string) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
            const parts = str.split('-');
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (m < 1 || m > 12 || d < 1 || d > 31) return false;
            const dateObj = new Date(y, m - 1, d);
            return dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
          };

          if (!birthDateStr || !isValidDate(birthDateStr)) {
            rowErrors.push("La date de naissance n'est pas valide.");
          }

          if (codeMassar && existingMassars.has(codeMassar.toUpperCase())) {
            rowErrors.push('Code Massar existe déjà.');
          }

          // Class level and number validation
          let matchedClasseId = '';
          const hasClassInput = inputNiveau || inputClasse;

          if (hasClassInput) {
            const allowedNiveaux = ['1AC', '2AC', '3AC'];
            const upperNiveau = inputNiveau.toUpperCase();
            if (!inputNiveau || !allowedNiveaux.includes(upperNiveau)) {
              rowErrors.push("Le niveau n'est pas valide.");
            }

            const classNum = parseInt(inputClasse, 10);
            const isPositiveInt = /^\d+$/.test(inputClasse) && !isNaN(classNum) && classNum > 0;
            if (!inputClasse || !isPositiveInt) {
              rowErrors.push("Le numéro n'est pas valide.");
            }

            if (allowedNiveaux.includes(upperNiveau) && isPositiveInt) {
              const matched = classes?.find(c =>
                c.niveau.toUpperCase() === upperNiveau &&
                c.numero === classNum
              );
              if (matched) {
                matchedClasseId = matched.id;
              } else {
                rowErrors.push(`La classe ${inputNiveau}-${inputClasse} n'existe pas.`);
              }
            }
          }

          if (rowErrors.length > 0) {
            errors.push({
              codeMassar,
              nom,
              prenom,
              birthDate: birthDateStr,
              niveau: inputNiveau,
              classe: inputClasse,
              error: rowErrors.join(' | ')
            });
            continue;
          }

          try {
            await elevesApi.create({
              codeMassar,
              nom,
              prenom,
              birthDate: birthDateStr,
              classeId: matchedClasseId
            });
            successes.push({ codeMassar, nom, prenom, birthDate: birthDateStr });
            existingMassars.add(codeMassar.toUpperCase());
          } catch (err: any) {
            let serverMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Erreur d\'enregistrement';
            if (err.response?.status === 409 || err.status === 409 || String(serverMsg).includes('409') || String(err.message).includes('409')) {
              serverMsg = 'Code Massar existe déjà.';
            }
            errors.push({
              codeMassar,
              nom,
              prenom,
              birthDate: birthDateStr,
              niveau: inputNiveau,
              classe: inputClasse,
              error: serverMsg
            });
          }
        }

        setImportResult({
          isOpen: true,
          total: successes.length + errors.length,
          successCount: successes.length,
          errorCount: errors.length,
          errorsList: errors
        });

        queryClient.invalidateQueries({ queryKey: ['eleves'] });
        setImportingFile(null);
        setShowImportModal(false);
      } catch (err: any) {
        console.error(err);
        alert("Une erreur s'est produite lors du décodage du fichier.");
      } finally {
        setIsImporting(false);
      }
    };
    fileReader.readAsArrayBuffer(importingFile);
  };

  const downloadErrorsExcel = (errorsList: any[]) => {
    const headers = ['Code Massar', 'Nom', 'Prénom', 'Date de naissance', 'Niveau', 'Numéro', 'Erreurs détectées'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    const data = errorsList.map(e => [
      e.codeMassar || '',
      e.nom || '',
      e.prenom || '',
      e.birthDate || '',
      e.niveau || '',
      e.classe || '',
      e.error || ''
    ]);
    
    XLSX.utils.sheet_add_aoa(ws, data, { origin: 'A2' });
    
    // Clean to strict text cells
    for (let r = 0; r <= data.length + 1; r++) {
      for (let c = 0; c < 7; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) {
          ws[cellRef] = { t: 's', v: '' };
        }
        ws[cellRef].z = '@';
      }
    }

    const colWidths = headers.map((header, colIndex) => {
      let maxLen = header.length;
      data.forEach(row => {
        const val = String(row[colIndex] || '');
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return {
        wch: Math.min(Math.max(maxLen + 4, 12), 52)
      };
    });

    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erreurs');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erreurs_importation_eleves.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    await updateMutation.mutateAsync({
      id: confirmDialog.eleveId,
      payload: { actif: confirmDialog.action === 'reactivate' }
    });
    setConfirmDialog(null);
  };

  const handleOpenModal = (eleve?: Eleve) => {
    setEditingEleve(eleve || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setEditingEleve(null);
    setShowModal(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }));
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedEleves);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEleves(next);
  };

  const toggleAll = () => {
    if (pageData?.data) {
      if (selectedEleves.size === pageData.data.length) {
        setSelectedEleves(new Set());
      } else {
        setSelectedEleves(new Set(pageData.data.map(e => e.id)));
      }
    }
  };

  const handleBulkToggle = (active: boolean) => {
    selectedEleves.forEach(id => {
      const el = pageData?.data?.find(e => e.id === id);
      if (el && el.actif !== active) {
        updateMutation.mutate({ id, payload: { actif: active } });
      }
    });
    setSelectedEleves(new Set());
  };

  const handleBulkUpdateClasse = () => {
    if (!selectedClasseForBulk) return;
    selectedEleves.forEach(id => {
      const el = pageData?.data?.find(e => e.id === id);
      if (el && el.classeId !== selectedClasseForBulk) {
        updateMutation.mutate({ id, payload: { classeId: selectedClasseForBulk } });
      }
    });
    setSelectedEleves(new Set());
    setSelectedClasseForBulk('');
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-blue-900 dark:text-blue-400">Gestion des Élèves</h1>
          {selectedEleves.size > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
                <select
                  value={selectedClasseForBulk}
                  onChange={(e) => setSelectedClasseForBulk(e.target.value)}
                  className="bg-transparent border-none text-sm px-3 py-1.5 text-gray-700 dark:text-slate-300 outline-none focus:ring-0 max-w-[150px] truncate"
                >
                  <option value="">Affecter à...</option>
                  {classes?.map(c => (
                    <option key={c.id} value={c.id}>{c.libelle || `${c.niveau}-${c.numero}`}</option>
                  ))}
                </select>
                <div className="w-px bg-gray-200 dark:border-slate-700 h-full py-2"></div>
                <button
                  onClick={handleBulkUpdateClasse}
                  disabled={!selectedClasseForBulk}
                  className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors disabled:opacity-50 h-full"
                >
                  Appliquer
                </button>
              </div>

              <div className="flex bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
                <button
                  onClick={() => handleBulkToggle(true)}
                  className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium transition-colors h-full"
                >
                  Activer
                </button>
                <div className="w-px bg-gray-200 dark:border-slate-700 h-full py-2"></div>
                <button
                  onClick={() => handleBulkToggle(false)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors h-full"
                >
                  Désactiver
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadCanevas}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            title="Télécharger le modèle de canevas Excel"
          >
            <FileDown className="w-4 h-4" />
            <span>Canevas Excel</span>
          </button>
          
          <button
            onClick={() => {
              setImportingFile(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md shadow-sm hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300 dark:hover:bg-blue-900/40 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Importer en masse</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors text-sm"
          >
            <Plus className="w-5 h-5" />
            Ajouter un élève
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou code Massar..."
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
            value={filters.classeId || ''}
            onChange={e => setFilters(f => ({ ...f, classeId: e.target.value || undefined, page: 1 }))}
          >
            <option value="">Toutes les classes</option>
            <option value="none">Aucune affectation</option>
            {classes?.map(c => (
              <option key={c.id} value={c.id}>{c.libelle || `${c.niveau}-${c.numero}`}</option>
            ))}
          </select>

          <select
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
            value={filters.actif === undefined ? '' : filters.actif.toString()}
            onChange={e => {
              const val = e.target.value;
              setFilters(f => ({ ...f, actif: val === '' ? undefined : val === 'true', page: 1 }));
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 shadow-sm">
              <tr className="border-b border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300">
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={!!(pageData?.data && pageData.data.length > 0 && selectedEleves.size === pageData.data.length)}
                    onChange={toggleAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 w-28">Massar</th>
                <th className="p-4 w-32">Nom</th>
                <th className="p-4 w-32">Prénom</th>
                <th className="p-4 w-28">Classe</th>
                <th className="p-4 w-36">CIN Parent</th>
                <th className="p-4 w-20">Statut</th>
                <th className="p-4 w-28 text-right">Actions</th>
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
              ) : pageData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-slate-400">
                    Aucun élève trouvé
                  </td>
                </tr>
              ) : (
                pageData?.data?.map((eleve) => (
                  <tr key={eleve.id} className="border-b border-gray-200 dark:border-slate-700 dark:border-gray-200 dark:border-slate-700/50 hover:bg-gray-100 dark:bg-slate-700/20 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedEleves.has(eleve.id)}
                        onChange={() => toggleSelection(eleve.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-gray-700 dark:text-slate-300 font-mono text-sm w-28 truncate">{eleve.codeMassar}</td>
                    <td className="p-4 text-gray-900 dark:text-slate-100 font-medium w-32 truncate">{eleve.nom}</td>
                    <td className="p-4 text-gray-900 dark:text-slate-100 w-32 truncate">{eleve.prenom}</td>
                    <td className="p-4 text-gray-700 dark:text-slate-300 w-28 truncate">
                      {eleve.classe ? (eleve.classe.libelle || `${eleve.classe.niveau}-${eleve.classe.numero}`) : <span className="text-gray-400 dark:text-slate-500 italic">Aucune affectation</span>}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-slate-300 font-mono text-sm w-36 truncate">
                      {eleve.parent?.cin || <span className="text-gray-400 dark:text-slate-500 italic">Aucun</span>}
                    </td>
                    <td className="p-4 w-20">
                      {eleve.actif ? (
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs font-medium px-2 py-1 rounded-full border border-emerald-500/20">Actif</span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 text-xs font-medium px-2 py-1 rounded-full border border-red-500/20">Inactif</span>
                      )}
                    </td>
                    <td className="p-4 w-28 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenModal(eleve)}
                          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                          title="Modifier les informations"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDialog({ isOpen: true, eleveId: eleve.id, action: eleve.actif ? 'deactivate' : 'reactivate' })}
                          className={`p-1.5 rounded transition-colors ${
                            eleve.actif 
                              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' 
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                          title={eleve.actif ? 'Désactiver' : 'Activer'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pageData && pageData.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Affichage {(pageData.page - 1) * pageData.limit + 1} à {Math.min(pageData.page * pageData.limit, pageData.total)} sur {pageData.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={pageData.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: pageData.page - 1 }))}
                className="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={pageData.page >= pageData.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: pageData.page + 1 }))}
                className="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <EleveModal
            eleve={editingEleve}
            classes={classes || []}
            onClose={handleCloseModal}
            onSubmit={(payload) => {
              if (editingEleve) {
                updateMutation.mutate({ id: editingEleve.id, payload }, { onSuccess: handleCloseModal });
              } else {
                createMutation.mutate(payload, { onSuccess: handleCloseModal });
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
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
                key="confirm-dialog-eleves"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 z-10"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Confirmer l'action</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-6 font-normal">
                  Êtes-vous sûr de vouloir {confirmDialog.action === 'deactivate' ? 'désactiver' : 'réactiver'} cet élève ?
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

          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isImporting && setShowImportModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-500" />
                    <span>Importer des élèves en masse</span>
                  </h3>
                  <button onClick={() => !isImporting && setShowImportModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Veuillez glisser-déposez votre fichier canevas Excel complété ci-dessous. Le document doit respecter strictement la structure du canevas officiel.
                  </p>

                  <div
                    onDragOver={(e) => { e.preventDefault(); if (!isImporting) setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (isImporting) return; const f = e.dataTransfer.files?.[0]; if (f) setImportingFile(f); }}
                    onClick={() => { if (!isImporting) document.getElementById('excel-file-hidden-input')?.click(); }}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-slate-900/20'
                    }`}
                  >
                    <input
                      id="excel-file-hidden-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportingFile(f); }}
                      className="hidden"
                      disabled={isImporting}
                    />
                    <Upload className={`w-12 h-12 transition-transform ${isDragging ? 'scale-110 text-blue-500' : 'text-gray-400'}`} />
                    {importingFile ? (
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{importingFile.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(importingFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="mt-2 text-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                          Glissez-déposez le fichier ici, ou <span className="text-blue-500 dark:text-blue-400">parcourez</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Fichiers Excel (.xlsx, .xls) supportés</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-900/20 shrink-0">
                  <Button variant="ghost" onClick={() => setShowImportModal(false)} disabled={isImporting}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleImportExcel}
                    disabled={!importingFile || isImporting}
                    loading={isImporting}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Lancer l'importation
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {importResult?.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setImportResult(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="p-5 flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
                  {importResult.errorCount === 0 ? (
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {importResult.errorCount === 0 ? 'Importation complétée' : "Rapport de l'importation"}
                    </h3>
                    <p className="text-xs text-gray-500">{importResult.total} élèves traités</p>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  {importResult.errorCount === 0 ? (
                    <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                      Félicitations! Tous les élèves ont été importés avec succès sans aucune erreur.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700 dark:text-slate-300">
                        L'importation s'est terminée avec des erreurs: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{importResult.successCount} réussis</span> et <span className="text-red-500 font-semibold">{importResult.errorCount} erreurs</span>.
                      </p>
                      
                      <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 space-y-2">
                        <p className="font-semibold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          Certaines lignes contiennent des erreurs d'intégration
                        </p>
                        <p className="text-xs text-gray-600 dark:text-slate-400 leading-normal">
                          Pour corriger et réimporter les élèves non validés, veuillez télécharger le canevas des erreurs ci-dessous, corriger les champs, et réimporter ce fichier corrigé.
                        </p>
                        <button
                          onClick={() => downloadErrorsExcel(importResult.errorsList)}
                          className="flex items-center gap-2 mt-2 px-3 py-1.5 hover:bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-250 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-200 dark:border-amber-900/30 font-medium text-xs transition"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Télécharger le canevas des erreurs
                        </button>
                      </div>

                      <div className="border border-gray-150 dark:border-slate-700 rounded-lg divide-y divide-gray-150 dark:divide-slate-700 overflow-hidden max-h-48 overflow-y-auto">
                        {importResult.errorsList.map((errItem, idx) => (
                          <div key={idx} className="p-3 text-xs bg-gray-50/50 dark:bg-slate-900/50">
                            <div className="flex justify-between font-semibold text-gray-700 dark:text-slate-300">
                              <span>{errItem.nom} {errItem.prenom}</span>
                              <span className="font-mono text-[10px] text-gray-400">{errItem.codeMassar}</span>
                            </div>
                            <span className="text-red-500 font-medium block mt-1">{errItem.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end bg-gray-50/50 dark:bg-slate-900/20 shrink-0">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setImportResult(null)}>
                    Fermer
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {headerErrorDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHeaderErrorDialog(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-10"
              >
                <div className="p-5 flex items-center gap-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
                  <div className="p-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      Erreur de format du canevas
                    </h3>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto">
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {headerErrorDialog}
                  </p>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end bg-gray-50/50 dark:bg-slate-900/20 shrink-0">
                  <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={() => setHeaderErrorDialog(null)}>
                    Fermer
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

function EleveModal({ 
  eleve, 
  classes,
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  eleve: Eleve | null; 
  classes: any[];
  onClose: () => void; 
  onSubmit: (payload: any) => void;
  isLoading: boolean;
}) {
  const [nom, setNom] = useState(eleve?.nom || '');
  const [prenom, setPrenom] = useState(eleve?.prenom || '');
  const [codeMassar, setCodeMassar] = useState(eleve?.codeMassar || '');
  // Extract YYYY-MM-DD from ISO date
  const defaultDate = eleve?.birthDate ? new Date(eleve.birthDate).toISOString().split('T')[0] : '';
  const [birthDate, setBirthDate] = useState(defaultDate);
  const [classeId, setClasseId] = useState(eleve?.classeId || '');
  const [actif, setActif] = useState(eleve ? eleve.actif : true);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {eleve ? "Modifier l'élève" : 'Nouvel élève'}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <form id="eleve-form" onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ nom, prenom, codeMassar, birthDate, classeId, actif });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Code Massar</label>
              <input
                type="text"
                value={codeMassar}
                onChange={e => setCodeMassar(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date de naissance</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Classe (Optionnel)</label>
              <select
                value={classeId}
                onChange={e => setClasseId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">Aucune classe</option>
                {classes?.map(c => (
                  <option key={c.id} value={c.id}>{c.libelle || `${c.niveau}-${c.numero}`}</option>
                ))}
              </select>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:text-slate-100 font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="eleve-form"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

