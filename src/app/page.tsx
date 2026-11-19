'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LuxuryLoader from '@/components/LuxuryLoader';

export default function RootPage() {
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
    <LuxuryLoader 
      size="fullscreen" 
      message="Connecting to your dashboard..." 
      subMessage="Fast authentication"
    />
  );
}
