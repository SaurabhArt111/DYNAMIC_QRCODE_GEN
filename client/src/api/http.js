import axios from 'axios';

const isDev = import.meta.env.DEV;

const API_URL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : import.meta.env.VITE_API_URL;

const STORAGE_URL = isDev
  ? 'http://localhost:5000'
  : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : window.location.origin);

export const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dv_token');
      localStorage.removeItem('dv_admin');
      if (window.location.pathname.startsWith('/dv-control')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export function fileUrl(relativeUrl) {
  if (!relativeUrl) return '';
  const localizedPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${STORAGE_URL}${localizedPath}`;
}
