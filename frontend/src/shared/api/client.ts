// frontend/src/shared/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

export const client = axios.create({
  baseURL: '/api',
});

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().access_token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!navigator.onLine) {
      return Promise.reject(new Error('Pas de connexion internet'));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
type Queued = { resolve: (t: string) => void; reject: (e: unknown) => void };
let queue: Queued[] = [];

const flush = (err: unknown, token: string | null) => {
  queue.forEach((q) => (err ? q.reject(err) : q.resolve(token!)));
  queue = [];
};

client.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response;
    }
    if (response.data?.success === true) {
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refresh_token;
        if (!refreshToken) throw new Error('No refresh token');

        // Intentionally hitting the auth refresh API
        const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        const newToken = res.data.data ? res.data.data.access_token : res.data.access_token;

        useAuthStore.getState().setAccessToken(newToken);
        flush(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return client(originalRequest);
      } catch (err) {
        flush(err, null);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
