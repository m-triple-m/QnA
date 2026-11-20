import axios from 'axios';

// Use VITE_API_URL if configured, otherwise fallback to relative '/api'
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.data.accessToken);
        error.config.headers['Authorization'] = `Bearer ${data.data.accessToken}`;
        return api(error.config);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export default api;
