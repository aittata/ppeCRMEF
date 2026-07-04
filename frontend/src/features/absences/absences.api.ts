// frontend/src/features/absences/absences.api.ts
import { client } from '@/shared/api/client'
import type { Absence, CreateAbsencePayload, UpdateEtatPayload,
              FilterAbsence, DashboardStats, PaginatedResponse } from '@/shared/types'

export const absencesApi = {
  findAll: (filters?: FilterAbsence) =>
    client.get<any, PaginatedResponse<Absence>>('/absences', { params: filters }),
  findById: (id: string) => client.get<any, Absence>(`/absences/${id}`),
  create: (payload: CreateAbsencePayload) =>
    client.post<any, Absence>('/absences', payload),
  updateEtat: (id: string, payload: UpdateEtatPayload) =>
    client.patch<any, Absence>(`/absences/${id}/etat`, payload),
  bulkUpdateEtat: (payload: { ids: string[]; etat: string; motif?: string }) =>
    client.patch<any, Absence[]>('/absences/bulk-etat', payload),
  remove: (id: string) => client.delete<any, { message: string }>(`/absences/${id}`),
  getDashboardStats: (filters?: Partial<FilterAbsence>) =>
    client.get<any, DashboardStats>('/absences/stats', { params: filters }),
  exportXls: (filters?: FilterAbsence) =>
    client.get<Blob, { data: Blob }>('/absences/export', {
      params: filters,
      responseType: 'blob',  // ← IMPORTANT : ne pas laisser l'intercepteur transformer le blob
    }).then(res => res.data),
}
