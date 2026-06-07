import api from './api';
import type { User } from '@/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<{ user: User }>('/auth/register', data).then((r) => r.data),

  login: (data: LoginPayload) =>
    api.post<{ user: User }>('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  getMe: () => api.get<{ user: User }>('/auth/me').then((r) => r.data),
};
