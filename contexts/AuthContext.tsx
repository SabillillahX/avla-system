'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { User, LoginCredentials, RegisterData, AuthContextType } from '@/lib/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        try {
          const { user: freshUser } = await authApi.me();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
          logout();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {

    const response = await authApi.login(credentials);

    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    setToken(response.token);
    setUser(response.user);

    router.push('/dashboard');

  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authApi.register(data);

      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setToken(response.token);
      setUser(response.user);

      router.push('/dashboard');
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      setToken(null);
      setUser(null);

      router.push('/auth/login');
    }
  };

  const refreshUser = async () => {
    try {
      const { user: freshUser } = await authApi.me();

      setUser(freshUser);

      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch (error) {
      console.error('Refresh user error:', error);

      logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
