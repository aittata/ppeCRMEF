// frontend/src/shared/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  setAuth: (user: User, access_token: string, refresh_token: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      setAuth: (user, access_token, refresh_token) => set({ user, access_token, refresh_token }),
      setAccessToken: (access_token) => set({ access_token }),
      clearAuth: () => set({ user: null, access_token: null, refresh_token: null }),
    }),
    {
      name: 'auth-school-v1',
    }
  )
);
