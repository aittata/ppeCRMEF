// frontend/src/features/users/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../users.api';
import type { CreateUserPayload, UpdateUserPayload } from '@/shared/types';
import { useToast } from '@/shared/hooks/useToast';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.findAll(),
  });
};

export const useUsersByRole = (role: string) => {
  return useQuery({
    queryKey: ['users', 'role', role],
    queryFn: () => usersApi.findByRole(role),
  });
};

export const useAuditLogs = (userId: string | null) => {
  return useQuery({
    queryKey: ['users', userId, 'audit'],
    queryFn: () => usersApi.getAuditLogs(userId!),
    enabled: !!userId,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
      if (variables.role === 'PARENT') {
        toast.success('eleve cree avec succes');
      } else {
        toast.success('Utilisateur créé');
      }
    },
    onError: (err: any) => {
      let msg = err.response?.data?.error || err.response?.data?.message;
      if (Array.isArray(msg)) {
        msg.forEach(m => toast.error(m));
      } else {
        toast.error(msg || err.response?.data?.error || 'Erreur lors de la création');
      }
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => 
      usersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
      toast.success('Modifié');
    },
    onError: (err: any) => {
      let msg = err.response?.data?.error || err.response?.data?.message;
      if (Array.isArray(msg)) {
        msg.forEach(m => toast.error(m));
      } else {
        toast.error(msg || err.response?.data?.error || 'Erreur lors de la modification');
      }
    }
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Désactivé');
    },
    onError: (err: any) => {
      toast.error((err.response?.data?.message || err.response?.data?.error) || 'Erreur lors de la désactivation');
    }
  });
};

export const useReactivateUser = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => usersApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Réactivé');
    },
    onError: (err: any) => {
      toast.error((err.response?.data?.message || err.response?.data?.error) || 'Erreur lors de la réactivation');
    }
  });
};
