'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm p-8 rounded-3xl bg-slate-900/80 border border-emerald-900/60 shadow-2xl backdrop-blur-xl">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-amber-400 animate-spin" />
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
        </div>
        <div>
          <h2 className="font-serif font-bold text-white text-lg">Shopify Catering Service</h2>
          <p className="text-xs text-slate-400 mt-1">ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...</p>
        </div>
      </div>
    </div>
  );
}
