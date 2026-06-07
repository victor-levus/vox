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
    if (error.response?.status === 401 && !url.endsWith('/auth/me')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
