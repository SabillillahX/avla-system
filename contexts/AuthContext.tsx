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

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verify token is still valid
        try {
          const { user: freshUser } = await authApi.me();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
          // Token invalid, clear everything
          logout();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      
      // Save token and user to localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update state
      setToken(response.token);
      setUser(response.user);
      
      // Redirect to home
      router.push('/');
    } catch (error: any) {
      // Re-throw error untuk ditangani di component
      throw error;
    }
  };

  // Register function
  const register = async (data: RegisterData) => {
    try {
      const response = await authApi.register(data);
      
      // Save token and user to localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update state
      setToken(response.token);
      setUser(response.user);
      
      // Redirect to home
      router.push('/');
    } catch (error: any) {
      // Re-throw error untuk ditangani di component
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API to revoke token
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear everything regardless of API call success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      
      // Redirect to login
      router.push('/auth/login');
    }
  };

  // Refresh user data
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

// Custom hook untuk menggunakan Auth Context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
