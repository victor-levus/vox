import { api } from './api';
import type { User } from '@/types';

export const authService = {
  getMe: () => api.get<{ user: User }>('/auth/me').then((r) => r.data),

  login: (email: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post<{ user: User }>('/auth/register', { name, email, password }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  guestJoin: (data: { name: string; organisation?: string; roomCode?: string; inviteToken?: string }) =>
    api.post<{ user: User; roomCode: string }>('/auth/guest-join', data).then((r) => r.data),
};
