'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Selamat datang, {user?.name}! 👋
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-lg mb-2">Informasi Akun</h2>
                <div className="space-y-2 text-sm">
                  <p><strong>Nama:</strong> {user?.name}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Role:</strong> {user?.roles.join(', ')}</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome to your dashboard! This is where you'll see an overview of all your projects, tasks, and analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
