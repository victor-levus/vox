import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? '';
    const publicRoutes = ['/auth/me', '/auth/guest-join'];
    const isPublic =
      publicRoutes.some((r) => url.endsWith(r)) || url.includes('/invitations/');
    if (error.response?.status === 401 && !isPublic) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
