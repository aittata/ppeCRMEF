import { useQuery } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export interface AuditLogItem {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  changes: any;
  createdAt: string;
  changedById: string;
  changedBy: {
    nom: string;
    prenom: string;
    role: string;
  };
}

export const useAuditLogs = () => {
  return useQuery<AuditLogItem[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const data: any = await client.get('/audit-logs');
      return data as AuditLogItem[];
    },
  });
};
