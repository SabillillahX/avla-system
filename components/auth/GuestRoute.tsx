'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirect authenticated users away from auth pages (login, register)
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect to home if already authenticated
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
