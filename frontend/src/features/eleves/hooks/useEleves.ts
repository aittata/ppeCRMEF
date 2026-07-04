// frontend/src/features/eleves/hooks/useEleves.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elevesApi } from '../eleves.api';
import type { CreateElevePayload, FilterEleve, PaginatedResponse, Eleve } from '@/shared/types';
import { useToast } from '@/shared/hooks/useToast';

export const useEleves = (params?: FilterEleve) => {
  return useQuery({
    queryKey: ['eleves', params],
    queryFn: () => elevesApi.findAll(params).then((res) => res as unknown as PaginatedResponse<Eleve>),
  });
};

export const useCreateEleve = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateElevePayload) => elevesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
      toast.success('Élève créé avec succès');
    },
    onError: (err: any) => {
      toast.error((err.response?.data?.message || err.response?.data?.error) || "Erreur lors de la création de l'élève");
    },
  });
};

export const useUpdateEleve = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateElevePayload> & { actif?: boolean } }) =>
      elevesApi.update(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
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
      toast.error((err.response?.data?.message || err.response?.data?.error) || "Erreur lors de la modification de l'élève");
    },
  });
};
