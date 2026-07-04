// frontend/src/features/seances/hooks/useSeances.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seancesApi } from '../seances.api';
import { useToast } from '@/shared/hooks/useToast';
import { CreateSeancePayload } from '@/shared/types';
import { isAxiosError } from 'axios';

export const useSeances = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const useFindAll = (filters: { enseignantId?: string; classeId?: string; matiere?: string; actif?: boolean }) => {
    return useQuery({
      queryKey: ['seances', filters],
      queryFn: () => seancesApi.findAll(filters),
    });
  };

  const useFindByEnseignant = (enseignantId: string, actifOnly?: boolean) => {
    return useQuery({
      queryKey: ['seances', 'enseignant', enseignantId, actifOnly],
      queryFn: () => seancesApi.findByEnseignant(enseignantId, actifOnly),
      enabled: !!enseignantId,
    });
  };

  const useFindByClasse = (classeId: string, actifOnly?: boolean) => {
    return useQuery({
      queryKey: ['seances', 'classe', classeId, actifOnly],
      queryFn: () => seancesApi.findByClasse(classeId, actifOnly),
      enabled: !!classeId,
    });
  };

  const createMutation = useMutation({
    mutationFn: seancesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seances'] });
      toast.success('Séance créée avec succès');
    },
    onError: (error: any) => {
       if (isAxiosError(error) && (error.response?.data?.message || error.response?.data?.error)) {
         // let component catch it if needed, or
       } else {
         toast.error('Erreur lors de la création de la séance');
       }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSeancePayload> & { actif?: boolean } }) => seancesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seances'] });
      toast.success('Séance modifiée avec succès');
    },
    onError: (error: any) => {
      if (!isAxiosError(error) || !(error.response?.data?.message || error.response?.data?.error)) {
        toast.error('Erreur lors de la modification de la séance');
      }
    }
  });

  const removeMutation = useMutation({
    mutationFn: seancesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seances'] });
      toast.success('Séance désactivée avec succès');
    },
    onError: (error: any) => {
      if (isAxiosError(error) && (error.response?.data?.message || error.response?.data?.error)) {
        toast.error((error.response.data.message || error.response.data.error));
      } else {
        toast.error('Erreur lors de la suppression de la séance');
      }
    }
  });

  return {
    useFindAll,
    useFindByEnseignant,
    useFindByClasse,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
  };
};
