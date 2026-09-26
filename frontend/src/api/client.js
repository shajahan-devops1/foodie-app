import axios from 'axios';

// In production this is same-origin (nginx proxies /api to the backend Service).
// In local dev, Vite's dev server proxies /api to VITE_API_PROXY (see vite.config.js).
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('forkwise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
