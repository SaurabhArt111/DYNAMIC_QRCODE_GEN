import axios from 'axios';

// 1. Determine environment cleanly using Vite's native boolean
const isDev = import.meta.env.DEV; 

// 2. Define Base URLs based on the environment
// In production, use the env variable. In development, fallback to localhost.
const API_URL = isDev 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : import.meta.env.VITE_API_URL;

const STORAGE_URL = isDev 
  ? 'http://localhost:5000' 
  : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '');

// Optional logging for debugging
console.log(`Running in ${isDev ? 'development' : 'production'} mode`);
console.log('API Base URL:', API_URL);

// 3. Create Axios Instance
export const api = axios.create({
  baseURL: API_URL,
});

// 4. Request Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 5. Adaptable File URL Helper
export function fileUrl(relativeUrl) {
  if (!relativeUrl) return '';
  // Ensures the relative URL starts with a slash
  const localizedPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${STORAGE_URL}${localizedPath}`;
}