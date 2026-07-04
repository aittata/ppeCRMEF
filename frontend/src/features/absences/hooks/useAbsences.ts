// frontend/src/features/absences/hooks/useAbsences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { absencesApi } from '../absences.api';
import { FilterAbsence, CreateAbsencePayload, UpdateEtatPayload } from '@/shared/types';
import { useToast } from '@/shared/hooks/useToast';

export const useAbsences = (filters?: FilterAbsence) => {
  return useQuery({
    queryKey: ['absences', filters],
    queryFn: () => absencesApi.findAll(filters),
  });
};

export const useDashboardStats = (filters?: Partial<FilterAbsence>) => {
  return useQuery({
    queryKey: ['stats', filters],
    queryFn: () => absencesApi.getDashboardStats(filters),
    staleTime: 60_000,
  });
};

export const useCreateAbsence = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CreateAbsencePayload) => absencesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erreur lors de la création de l\'absence');
    }
  });
};

export const useUpdateEtatAbsence = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEtatPayload }) => absencesApi.updateEtat(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('État mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erreur lors de la mise à jour de l\'état');
    }
  });
};

export const useBulkUpdateEtatAbsence = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: { ids: string[]; etat: string; motif?: string }) => absencesApi.bulkUpdateEtat(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Absences mises à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erreur lors de la mise à jour des absences');
    }
  });
};

export const useRemoveAbsence = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => absencesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Absence supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erreur lors de la suppression de l\'absence');
    }
  });
};

export const useExportAbsences = () => {
  const toast = useToast();

  return useMutation({
    mutationFn: (filters?: FilterAbsence) => absencesApi.exportXls(filters),
    onSuccess: (blob) => {
      import('file-saver').then(({ saveAs }) => {
        saveAs(blob, `absences-${new Date().toISOString().slice(0, 10)}.xlsx`);
      });
      toast.success('Export généré avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la génération de l\'export');
    }
  });
};
