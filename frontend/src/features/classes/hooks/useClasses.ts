// frontend/src/features/classes/hooks/useClasses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../classes.api';
import type { CreateClassePayload, Classe } from '@/shared/types';
import { useToast } from '@/shared/hooks/useToast';

export const useClasses = (params?: { actif?: boolean, niveau?: string }) => {
  return useQuery({
    queryKey: ['classes', params],
    queryFn: () => classesApi.findAll(params).then((res) => res as unknown as Classe[]),
  });
};

export const useCreateClasse = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateClassePayload) => classesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Classe créée avec succès');
    },
    onError: (err: any) => {
      toast.error((err.response?.data?.message || err.response?.data?.error) || 'Erreur lors de la création de la classe');
    },
  });
};

export const useUpdateClasse = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateClassePayload> & { actif?: boolean } }) =>
      classesApi.update(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      const isStatusOnly = Object.keys(variables.payload).length === 1 && 'actif' in variables.payload;
      if (isStatusOnly) {
        if (variables.payload.actif) {
          toast.success('Réactivé');
        } else {
          toast.success('Désactivé');
        }
      } else {
        toast.success('Modifié');
      }
    },
    onError: (err: any) => {
      toast.error((err.response?.data?.message || err.response?.data?.error) || 'Erreur lors de la modification de la classe');
    },
  });
};
