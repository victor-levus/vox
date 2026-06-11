import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();

export const api = wrapper(
  axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://vox.sleecetechnologies.com.ng/api',
    withCredentials: true,
    jar,
    timeout: 15000,
  }),
);

// 401 on any route other than /auth/me → no redirect on mobile, just let the caller handle it
api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error),
);
