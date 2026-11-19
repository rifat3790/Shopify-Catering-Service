'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sparkles } from 'lucide-react';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'super_admin') {
        router.replace('/super-admin');
      } else if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/user');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-xs">Connecting to authorized catering portal...</p>
      </div>
    </div>
  );
}
