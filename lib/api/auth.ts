import api from './axios';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';

// Auth API endpoints
export const authApi = {
  // Register new user (student)
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/register', data);
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', credentials);
    return response.data;
  },

  // Logout user (revoke token)
  logout: async (): Promise<void> => {
    await api.post('/logout');
  },

  // Get current authenticated user
  me: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/me');
    return response.data;
  },
};
