// frontend/src/features/auth/auth.api.ts
import { client } from '@/shared/api/client'
import type { LoginPayload, LoginResponse } from '@/shared/types'

export const authApi = {
  login: (payload: LoginPayload) =>
    client.post<LoginResponse>('/auth/login', payload),
  refresh: (refresh_token: string) =>
    client.post<{ access_token: string }>('/auth/refresh', { refresh_token }),
  logout: () => client.post<{ message: string }>('/auth/logout'),
  me: () => client.get<LoginResponse['user']>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    client.post<{ message: string }>('/auth/change-password', { oldPassword, newPassword }),
}
