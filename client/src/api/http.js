import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function fileUrl(relativeUrl) {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return `${apiBase.replace(/\/api$/, '')}${relativeUrl}`;
}
