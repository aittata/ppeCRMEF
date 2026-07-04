// frontend/src/features/users/users.api.ts
import { client } from '@/shared/api/client'
import type { User, CreateUserPayload, UpdateUserPayload } from '@/shared/types'

export const usersApi = {
  findAll: () => client.get<User[]>('/users'),
  findByRole: (role: string) => client.get<User[]>(`/users/role/${role}`),
  findById: (id: string) => client.get<User>(`/users/${id}`),
  getAuditLogs: (id: string) => client.get<any[]>(`/users/${id}/audit`),
  create: (payload: CreateUserPayload) => client.post<User>('/users', payload),
  update: (id: string, payload: UpdateUserPayload) => client.put<User>(`/users/${id}`, payload),
  deactivate: (id: string) => client.patch<{ message: string }>(`/users/${id}/deactivate`),
  reactivate: (id: string) => client.patch<{ message: string }>(`/users/${id}/reactivate`),
}
