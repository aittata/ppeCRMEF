// frontend/src/features/classes/classes.api.ts
import { client } from '@/shared/api/client'
import type { Classe, CreateClassePayload } from '@/shared/types'

export const classesApi = {
  findAll: (params?: { actif?: boolean, niveau?: string }) => client.get<Classe[]>('/classes', { params }),
  findByEnseignant: (enseignantId: string) => client.get<Classe[]>(`/classes/enseignant/${enseignantId}`),
  findById: (id: string) => client.get<Classe>(`/classes/${id}`),
  create: (payload: CreateClassePayload) => client.post<Classe>('/classes', payload),
  update: (id: string, payload: Partial<CreateClassePayload>) => client.put<Classe>(`/classes/${id}`, payload),
  getStats: (id: string) => client.get<any>(`/classes/${id}/stats`),
}
