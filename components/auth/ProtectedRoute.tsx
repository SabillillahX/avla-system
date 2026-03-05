'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[]; // Optional: require specific role(s)
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
    }

    // Check role if required
    if (!isLoading && isAuthenticated && requireRole && user) {
      const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
      const hasRequiredRole = user.roles.some(role => allowedRoles.includes(role));

      if (!hasRequiredRole) {
        // Redirect to unauthorized page or dashboard
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, requireRole, user, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if role check fails
  if (requireRole && user) {
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasRequiredRole = user.roles.some(role => allowedRoles.includes(role));

    if (!hasRequiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
