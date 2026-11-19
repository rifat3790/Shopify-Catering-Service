'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/lib/types';
import Link from 'next/link';
import { ShieldAlert, Lock, ArrowRight, Sparkles } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm p-8 rounded-3xl bg-slate-900/80 border border-emerald-900/60 shadow-2xl backdrop-blur-xl">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-bold text-white text-base">Shopify Catering</h3>
            <p className="text-xs text-emerald-400/90 mt-1">নিরাপদ অ্যাক্সেস যাচাই করা হচ্ছে...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="text-center space-y-4 max-w-md p-8 rounded-3xl bg-slate-900/90 border border-rose-900/60 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-700/60 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-xl text-white">লগইন প্রয়োজন (Login Required)</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            ড্যাশবোর্ড ব্যবহারের জন্য অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs shadow-lg hover:scale-105 transition-all"
            >
              <span>লগইন পেজে যান</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Role authorization check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const isSuperOnly = allowedRoles.length === 1 && allowedRoles[0] === 'super_admin';
    const isAdminOnly = allowedRoles.includes('admin') && !allowedRoles.includes('user');

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="text-center space-y-4 max-w-md p-8 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/60 flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h2 className="font-serif font-bold text-xl text-white">
              {isSuperOnly ? 'শুধুমাত্র সুপার অ্যাডমিন অ্যাক্সেস' : (isAdminOnly ? 'শুধুমাত্র অ্যাডমিন অ্যাক্সেস' : 'অননুমোদিত অ্যাক্সেস')}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              আপনার বর্তমান রোল (<strong className="text-amber-300 uppercase">{user.role}</strong>) দিয়ে এই ড্যাশবোর্ড দেখা সম্ভব নয়।
              {isSuperOnly && ' এই পেজটি শুধুমাত্র সুপার অ্যাডমিন mdrifayethossen@gmail.com দেখতে পারবেন।'}
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/user"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
            >
              আমার ড্যাশবোর্ডে যান (User Hub)
            </Link>
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors"
              >
                অ্যাডমিন ড্যাশবোর্ড
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

