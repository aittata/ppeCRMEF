// frontend/src/shared/utils/absence.utils.ts
import { EtatAbsence, Role } from '../types';

export const etatBadgeClass = (etat: EtatAbsence): string => {
  const classes: Record<EtatAbsence, string> = {
    EN_ATTENTE: 'bg-amber-900/40 text-amber-300 border border-amber-700/60',
    JUSTIFIEE: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60',
    NON_JUSTIFIEE: 'bg-red-900/40 text-red-300 border border-red-700/60',
  };
  return classes[etat] || '';
};

export const roleBadgeClass = (role: Role): string => {
  const classes: Record<Role, string> = {
    ADMIN: 'bg-purple-900/40 text-purple-300 border border-purple-700/60',
    CADRE_ADMINISTRATIF: 'bg-blue-900/40 text-blue-300 border border-blue-700/60',
    ENSEIGNANT: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60',
    PARENT: 'bg-pink-900/40 text-pink-300 border border-pink-700/60',
  };
  return classes[role] || 'bg-gray-900/40 text-gray-300 border border-gray-700/60';
};

export const tauxColor = (t: number): string =>
  t > 15 ? 'text-red-400' : t > 8 ? 'text-amber-400' : 'text-emerald-400';

export const classeLibelle = (niveau: string, numero: number): string =>
  `${niveau}-${numero}`;
