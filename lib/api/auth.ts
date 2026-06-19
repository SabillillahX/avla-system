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

  updateProfile: async (payload: {
    name?: string;
    email?: string;
    current_password?: string;
    password?: string;
    password_confirmation?: string;
    avatar?: File | null;
  }): Promise<{ message: string; user: User }> => {
    // Use FormData so we can send a file alongside text fields
    const formData = new FormData();
    formData.append('_method', 'PUT');
    if (payload.name !== undefined)                 formData.append('name', payload.name);
    if (payload.email !== undefined)                formData.append('email', payload.email);
    if (payload.current_password !== undefined)     formData.append('current_password', payload.current_password);
    if (payload.password !== undefined)             formData.append('password', payload.password);
    if (payload.password_confirmation !== undefined) formData.append('password_confirmation', payload.password_confirmation);
    if (payload.avatar)                             formData.append('avatar', payload.avatar);

    const response = await api.post<{ message: string; user: User }>('/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
