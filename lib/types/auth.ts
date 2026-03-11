// Auth Types & Interfaces

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  roles: string[];
  permissions?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ErrorResponse {
  message: string;
  errors?: {
    [key: string]: string[];
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
