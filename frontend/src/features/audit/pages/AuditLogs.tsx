import { useAuditLogs } from '../api/useAuditLogs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Delete, Pencil, Clock } from 'lucide-react';
import { useUsers } from '../../users/hooks/useUsers';
import { useClasses } from '../../classes/hooks/useClasses';
import { useAbsences } from '../../absences/hooks/useAbsences';
import { useEleves } from '../../eleves/hooks/useEleves';
import { useSeances } from '../../seances/hooks/useSeances';

export default function AuditLogs() {
  const { data: logs, isLoading } = useAuditLogs();
  const { data: users } = useUsers();
  const { data: classes } = useClasses();
  const { data: absences } = useAbsences({ limit: 10000 });
  const { data: eleves } = useEleves({ limit: 1000 } as any);
  const { useFindAll: useFindAllSeances } = useSeances();
  const { data: seances } = useFindAllSeances({});

  const getFieldNameInFrench = (field: string) => {
    switch (field) {
      case 'nom': return 'Nom';
      case 'prenom': return 'Prénom';
      case 'codeMassar': return 'Code Massar';
      case 'classeId': return 'Classe';
      case 'parentId': return 'Compte Parent Associé';
      case 'birthDate': return 'Date Naissance';
      case 'contactParent': return 'Contact Parent';
      case 'actif': return 'Statut';
      case 'niveau': return 'Niveau';
      case 'numero': return 'Numéro';
      case 'salle': return 'Salle';
      case 'matiere': return 'Matière';
      case 'jourSemaine': return 'Jour';
      case 'heureDebut': return 'Heure Début';
      case 'heureFin': return 'Heure Fin';
      case 'password': return 'Mot de passe';
      default: return field;
    }
  };

  const getValueDisplay = (field: string, value: any) => {
    if (value === null || value === undefined || value === 'null' || value === '') {
      return 'Aucun';
    }
    if (value === true || value === 'true') return 'Actif';
    if (value === false || value === 'false') return 'Inactif';
    
    if (field === 'classeId') {
      const classesList: any = (classes as any)?.data || classes;
      const found = classesList?.find((c: any) => c.id === value);
      if (found) {
        return found.libelle || `${found.niveau}-${found.numero}`;
      }
    }
    if (field === 'parentId') {
      const usersList: any = (users as any)?.data || users;
      const found = usersList?.find((u: any) => u.id === value);
      if (found) {
        return found.username || `${found.nom} ${found.prenom}`;
      }
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getActionInfo = (action: string) => {
    switch (action) {
      case 'CREATE': return { icon: <Plus className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600', label: 'Création' };
      case 'UPDATE': return { icon: <Pencil className="w-4 h-4" />, color: 'bg-blue-50 text-blue-600', label: 'Modification' };
      case 'DELETE': return { icon: <Delete className="w-4 h-4" />, color: 'bg-red-50 text-red-600', label: 'Suppression' };
      case 'DEACTIVATE': return { icon: <Clock className="w-4 h-4" />, color: 'bg-orange-50 text-orange-600', label: 'Désactivation' };
      case 'REACTIVATE': return { icon: <Clock className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600', label: 'Réactivation' };
      default: return { icon: <Plus className="w-4 h-4" />, color: 'bg-gray-50 text-gray-600', label: action };
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journaux d'Audit</h1>
      </div>
      <div className="bg-white dark:bg-slate-800 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date & Heure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Acteur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-sm">Détails (Modifications)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {logs?.map((log) => {
                let isStatusChange = false;
                let isDeactivation = false;
                let isReactivation = false;

                if (log.action === 'DEACTIVATE') {
                  isStatusChange = true;
                  isDeactivation = true;
                } else if (log.action === 'REACTIVATE') {
                  isStatusChange = true;
                  isReactivation = true;
                } else if (log.action !== 'CREATE' && log.changes && log.changes.actif !== undefined) {
                  const actifVal = log.changes.actif;
                  const newVal = (actifVal && typeof actifVal === 'object' && 'new' in actifVal) ? actifVal.new : actifVal;
                  const oldVal = (actifVal && typeof actifVal === 'object' && 'old' in actifVal) ? actifVal.old : undefined;

                  if (newVal !== oldVal) {
                    isStatusChange = true;
                    if (newVal === false || newVal === 'false' || newVal === 0 || newVal === '0') {
                      isDeactivation = true;
                    } else if (newVal === true || newVal === 'true' || newVal === 1 || newVal === '1') {
                      isReactivation = true;
                    }
                  }
                }

                const baseInfo = getActionInfo(log.action);
                const info = isStatusChange ? 
                  (isDeactivation ? 
                    { icon: <Clock className="w-4 h-4" />, color: 'bg-orange-50 text-orange-600', label: 'Désactivation' } :
                    { icon: <Clock className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600', label: 'Réactivation' }
                  ) : baseInfo;

                const getStatusDetailMessage = (entityName: string, isReactivationFlag: boolean) => {
                  let ent = "L'élément";
                  let fem = false;
                  if (entityName === 'USER') { ent = 'Le compte'; fem = false; }
                  else if (entityName === 'ELEVE') { ent = "L'élève"; fem = false; }
                  else if (entityName === 'CLASSE') { ent = "La classe"; fem = true; }
                  else if (entityName === 'SEANCE') { ent = "La séance"; fem = true; }
                  else if (entityName === 'ABSENCE') { ent = "L'absence"; fem = true; }
                  
                  if (isReactivationFlag) {
                    return fem ? `${ent} est réactivée.` : `${ent} est réactivé.`;
                  } else {
                    return fem ? `${ent} est désactivée.` : `${ent} est désactivé.`;
                  }
                };

                let targetName = null;
                if (log.entityName === 'USER') {
                  const usersList: any = (users as any)?.data || users;
                  const targetUser = usersList?.find((u: any) => u.id === log.entityId);
                  if (targetUser) targetName = targetUser.username;
                } else if (log.entityName === 'CLASSE') {
                  const classesList: any = (classes as any)?.data || classes;
                  const targetClasse = classesList?.find((c: any) => c.id === log.entityId);
                  if (targetClasse) targetName = `${targetClasse.niveau}-${targetClasse.numero}`;
                } else if (log.entityName === 'ELEVE') {
                  const elevesList: any = (eleves as any)?.data || eleves;
                  const targetEleve = elevesList?.find((e: any) => e.id === log.entityId);
                  if (targetEleve) {
                    targetName = `${targetEleve.nom} ${targetEleve.prenom} (Massar : ${targetEleve.codeMassar})`;
                  } else {
                    const nVal = log.changes?.nom?.new || log.changes?.nom?.old || log.changes?.nom || '';
                    const pVal = log.changes?.prenom?.new || log.changes?.prenom?.old || log.changes?.prenom || '';
                    const cMassar = log.changes?.codeMassar?.new || log.changes?.codeMassar?.old || log.changes?.codeMassar || '';
                    if (nVal || pVal) {
                      targetName = `${nVal} ${pVal}${cMassar ? ` (Massar : ${cMassar})` : ''}`.trim();
                    } else if (cMassar) {
                      targetName = `Massar : ${cMassar}`;
                    }
                  }
                } else if (log.entityName === 'SEANCE') {
                  const seancesList: any = (seances as any)?.data || seances;
                  const targetSeance = seancesList?.find((s: any) => s.id === log.entityId);
                  if (targetSeance) {
                    const cl = targetSeance.classe ? `${targetSeance.classe.niveau}-${targetSeance.classe.numero}` : 'Classe';
                    targetName = `${cl} • ${targetSeance.jourSemaine} ${targetSeance.heureDebut}-${targetSeance.heureFin} (${targetSeance.matiere})`;
                  } else {
                    const js = log.changes?.jourSemaine?.new || log.changes?.jourSemaine?.old || log.changes?.jourSemaine || '';
                    const hd = log.changes?.heureDebut?.new || log.changes?.heureDebut?.old || log.changes?.heureDebut || '';
                    const hf = log.changes?.heureFin?.new || log.changes?.heureFin?.old || log.changes?.heureFin || '';
                    const mat = log.changes?.matiere?.new || log.changes?.matiere?.old || log.changes?.matiere || '';
                    if (js && hd) {
                      targetName = `${js} ${hd}${hf ? '-' + hf : ''} (${mat})`;
                    }
                  }
                } else if (log.entityName === 'ABSENCE') {
                  const absencesList: any = (absences as any)?.data?.data || (absences as any)?.data || absences;
                  const targetAbsence = absencesList?.find((a: any) => a.id === log.entityId);
                  
                  const elevesList: any = (eleves as any)?.data || eleves;
                  
                  let eleveId = log.changes?.eleveId;
                  if (eleveId && typeof eleveId === 'object' && eleveId !== null) {
                    eleveId = eleveId.new || eleveId.old;
                  }
                  if (!eleveId && targetAbsence) {
                    eleveId = targetAbsence.eleveId;
                  }

                  const targetEleve = eleveId ? elevesList?.find((e: any) => e.id === eleveId) : null;

                  let codeMassar = '';
                  const cMassarVal = log.changes?.codeMassar;
                  if (cMassarVal) {
                    codeMassar = (typeof cMassarVal === 'object' && cMassarVal !== null) ? (cMassarVal.new || cMassarVal.old || '') : String(cMassarVal);
                  }
                  if (!codeMassar && targetEleve) {
                    codeMassar = targetEleve.codeMassar || '';
                  }
                  if (!codeMassar && targetAbsence?.eleve) {
                    codeMassar = targetAbsence.eleve.codeMassar || '';
                  }

                  let dateVal = log.changes?.date;
                  if (dateVal && typeof dateVal === 'object' && dateVal !== null) {
                    dateVal = dateVal.new || dateVal.old;
                  }
                  if (!dateVal && targetAbsence) {
                    dateVal = targetAbsence.date;
                  }

                  let hDeb = log.changes?.heureDebut;
                  if (hDeb && typeof hDeb === 'object' && hDeb !== null) {
                    hDeb = hDeb.new || hDeb.old;
                  }
                  if (!hDeb && targetAbsence) {
                    hDeb = targetAbsence.heureDebut;
                  }

                  let hFin = log.changes?.heureFin;
                  if (hFin && typeof hFin === 'object' && hFin !== null) {
                    hFin = hFin.new || hFin.old;
                  }
                  if (!hFin && targetAbsence) {
                    hFin = targetAbsence.heureFin;
                  }

                  let formattedDate = '';
                  if (dateVal) {
                    try {
                      if (typeof dateVal === 'string' && dateVal.includes('-')) {
                        const parts = dateVal.split('T')[0].split('-');
                        if (parts.length === 3) {
                          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                      }
                      if (!formattedDate) {
                        formattedDate = format(new Date(dateVal), "dd/MM/yyyy");
                      }
                    } catch (e) {
                      formattedDate = String(dateVal);
                    }
                  }

                  const timeRange = hFin ? `${hDeb}-${hFin}` : (hDeb || '');
                  const creneauInfo = formattedDate ? `${formattedDate}${timeRange ? ' ' + timeRange : ''}` : timeRange;

                  if (codeMassar && creneauInfo) {
                    targetName = `${codeMassar} (${creneauInfo})`;
                  } else if (codeMassar) {
                    targetName = codeMassar;
                  } else if (creneauInfo) {
                    targetName = `Absence (${creneauInfo})`;
                  }
                }

                const filteredEntries = (() => {
                  const entries = Object.entries(log.changes || {});
                  if (log.entityName === 'ABSENCE' && log.action === 'UPDATE') {
                    return entries.filter(([_, vals]: [string, any]) => {
                      if (vals && typeof vals === 'object' && ('old' in vals || 'new' in vals)) {
                        return vals.old !== vals.new;
                      }
                      return false;
                    });
                  }
                  return entries;
                })();

                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 align-top">
                      {format(new Date(log.createdAt), "dd/MM/yyyy à HH:mm", { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${info.color}`}>
                        {info.icon}
                        {info.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white align-top">
                      {log.changedBy ? `${log.changedBy.nom} ${log.changedBy.prenom}` : 'Système'}
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {log.changedBy?.role === 'ADMIN' ? 'Admin' : log.changedBy?.role === 'CADRE_ADMINISTRATIF' ? 'Cadre' : 'Enseignant'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white align-top max-w-[200px]">
                      {log.entityName === 'USER' ? 'Utilisateur' : 
                       log.entityName === 'ELEVE' ? 'Élève' : 
                       log.entityName === 'SEANCE' ? 'Séance' : 
                       log.entityName.charAt(0) + log.entityName.slice(1).toLowerCase()}
                      {targetName ? (
                         <div className="text-gray-500 dark:text-slate-400 font-medium text-xs mt-1 break-words">« {targetName} »</div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-[200px] break-words" title={log.entityId}>
                          <span className="font-mono">{log.entityId.slice(0, 8)}...</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top max-w-sm break-words">
                      {isStatusChange ? (
                        <span className={`text-sm font-medium ${isReactivation ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {getStatusDetailMessage(log.entityName, isReactivation)}
                        </span>
                      ) : log.action === 'CREATE' ? (
                         <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                           {log.entityName === 'ABSENCE' ? "L'absence est créé." : 
                            log.entityName === 'ELEVE' ? "L'élève est créé." :
                            log.entityName === 'SEANCE' ? "La séance est créée." :
                            log.entityName === 'CLASSE' ? "La classe est créée." :
                            log.entityName === 'USER' ? 'Le compte est créé' : 'L\'élément est créé'}
                         </span>
                      ) : log.action === 'DELETE' && log.entityName === 'ABSENCE' ? (
                         <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                           L'absence est supprimer.
                         </span>
                      ) : log.action === 'DELETE' && log.entityName === 'SEANCE' ? (
                         <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                           La séance est supprimée.
                         </span>
                      ) : filteredEntries && filteredEntries.length > 0 ? (
                        <ul className="space-y-2">
                          {filteredEntries.map(([field, vals]: [string, any]) => (
                            <li key={field} className="text-sm grid grid-cols-[110px_1fr] items-baseline gap-2">
                              <span className="text-gray-500 dark:text-slate-400 font-medium truncate" title={field}>
                                {getFieldNameInFrench(field)}:
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span 
                                  className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded border border-red-200 dark:border-red-800/50 line-through decoration-red-400/50 text-xs truncate max-w-[150px]" 
                                  title={getValueDisplay(field, vals?.old)}
                                >
                                  {getValueDisplay(field, vals?.old)}
                                </span>
                                <span className="text-gray-400 dark:text-slate-500 text-xs">→</span>
                                <span 
                                  className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800/50 font-medium text-xs truncate max-w-[150px]" 
                                  title={getValueDisplay(field, vals?.new)}
                                >
                                  {getValueDisplay(field, vals?.new)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 text-sm italic">Aucun détail</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    Aucun journal d'audit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
