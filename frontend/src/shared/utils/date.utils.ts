// frontend/src/shared/utils/date.utils.ts
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (d: string | Date, fmt = 'dd/MM/yyyy'): string => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, fmt, { locale: fr });
};

export const formatDateLong = (d: string | Date): string => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'EEEE d MMMM yyyy', { locale: fr });
};

export const formatCreneau = (debut: string, fin: string): string => {
  return `${debut} – ${fin}`;
};

export const anneeActuelle = (): string => {
  const date = new Date();
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

export const joursDepuis = (d: string | Date): number => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return differenceInDays(new Date(), date);
};
