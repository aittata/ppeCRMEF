// frontend/src/features/eleves/eleves.api.ts
import { client } from '@/shared/api/client'
import type { Eleve, CreateElevePayload, FilterEleve, PaginatedResponse } from '@/shared/types'

export const elevesApi = {
  findAll: (params?: FilterEleve) => client.get<PaginatedResponse<Eleve>>('/eleves', { params }),
  findById: (id: string) => client.get<Eleve>(`/eleves/${id}`),
  create: (payload: CreateElevePayload) => client.post<Eleve>('/eleves', payload),
  update: (id: string, payload: Partial<CreateElevePayload> & { actif?: boolean }) => client.put<Eleve>(`/eleves/${id}`, payload),
  getStats: (id: string) => client.get<any>(`/eleves/${id}/stats`),
}
