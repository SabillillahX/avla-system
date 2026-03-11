import axios from 'axios';

// Base URL untuk API Laravel
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // withCredentials: false untuk token-based auth (no cookies/session)
  withCredentials: false,
});

// Request interceptor - attach token ke setiap request
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - token expired atau invalid
    if (error.response?.status === 401) {
      // Clear token dan redirect ke login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Redirect ke login jika bukan di halaman login/register
      if (typeof window !== 'undefined' && 
          !window.location.pathname.includes('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Forbidden: You do not have permission to access this resource');
    }
    
    return Promise.reject(error);
  }
);

export default api;
