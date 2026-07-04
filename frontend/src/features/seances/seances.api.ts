// frontend/src/features/seances/seances.api.ts
import { client } from '@/shared/api/client';
import { Seance, CreateSeancePayload } from '@/shared/types';

export const seancesApi = {
  findAll: async (filters: { enseignantId?: string; classeId?: string; matiere?: string; actif?: boolean }) => {
    const params = new URLSearchParams();
    if (filters.enseignantId) params.append('enseignantId', filters.enseignantId);
    if (filters.classeId) params.append('classeId', filters.classeId);
    if (filters.matiere) params.append('matiere', filters.matiere);
    if (filters.actif !== undefined) params.append('actif', filters.actif.toString());

    const res = await client.get<Seance[]>('/seances?' + params.toString());
    return res as unknown as Seance[];
  },

  findByEnseignant: async (enseignantId: string, actifOnly?: boolean) => {
    const res = await client.get<Seance[]>(`/seances/enseignant/${enseignantId}` + (actifOnly ? '?actifOnly=true' : ''));
    return res as unknown as Seance[];
  },

  findByClasse: async (classeId: string, actifOnly?: boolean) => {
    const res = await client.get<Seance[]>(`/seances/classe/${classeId}` + (actifOnly ? '?actifOnly=true' : ''));
    return res as unknown as Seance[];
  },

  findById: async (id: string) => {
    const res = await client.get<Seance>(`/seances/${id}`);
    return res as unknown as Seance;
  },

  create: async (data: CreateSeancePayload) => {
    const res = await client.post<Seance>('/seances', data);
    return res as unknown as Seance;
  },

  update: async (id: string, data: Partial<CreateSeancePayload> & { actif?: boolean }) => {
    const res = await client.put<Seance>(`/seances/${id}`, data);
    return res as unknown as Seance;
  },

  remove: async (id: string) => {
    const res = await client.delete<{ success: boolean; message: string }>(`/seances/${id}`);
    return res as unknown as { success: boolean; message: string };
  }
};
