import api from './axios';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/logout');
  },

  me: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/me');
    return response.data;
  },
};
