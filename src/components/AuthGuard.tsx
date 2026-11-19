'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole, RoutePermissions, DEFAULT_ROUTE_PERMISSIONS } from '@/lib/types';
import Link from 'next/link';
import { ShieldAlert, Lock, ArrowRight, ShieldX } from 'lucide-react';
import LuxuryLoader from '@/components/LuxuryLoader';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [routePerms, setRoutePerms] = useState<RoutePermissions | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      fetch('/api/admin/permissions')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data) {
            setRoutePerms(data.data);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Luxury Fast Loading state
  if (loading) {
    return (
      <LuxuryLoader 
        size="fullscreen" 
        message="Authenticating session..." 
        subMessage="Fast access verification"
      />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="text-center space-y-4 max-w-md p-8 rounded-3xl bg-slate-900/90 border border-rose-900/60 shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-700/60 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-xl text-white">Authentication Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please sign in to your catering account to access this private dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs shadow-lg hover:scale-105 transition-all"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Super Admin bypasses all checks
  const isSuper = user.role === 'super_admin';

  // Role authorization check (static role restrictions)
  if (!isSuper && allowedRoles && !allowedRoles.includes(user.role)) {
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
              {isSuperOnly ? 'Super Admin Access Only' : (isAdminOnly ? 'Admin Access Required' : 'Access Restricted')}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Your account role (<strong className="text-amber-300 uppercase">{user.role}</strong>) does not have clearance for this command center.
              {isSuperOnly && ' This portal is strictly reserved for the Super Admin.'}
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/user"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
            >
              Go to My User Hub
            </Link>
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors"
              >
                Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dynamic Route Permission Check (configured by Super Admin)
  if (!isSuper && routePerms) {
    const roleKey = user.role === 'admin' ? 'admin' : 'user';
    const allowedPaths = routePerms[roleKey] || DEFAULT_ROUTE_PERMISSIONS[roleKey];
    
    // Check if the current pathname is restricted
    const isLocked = !allowedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (isLocked) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
          <div className="text-center space-y-4 max-w-md p-8 rounded-3xl bg-slate-900/90 border border-rose-600/50 shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/60 flex items-center justify-center mx-auto text-rose-400">
              <ShieldX className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono uppercase mb-2">
                <Lock className="w-3 h-3" />
                <span>Locked by Super Admin</span>
              </div>
              <h2 className="font-serif font-bold text-xl text-white">
                Route Access Locked
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                The Super Admin has restricted access to route <strong className="text-amber-300 font-mono">{pathname}</strong> for role <strong className="text-emerald-300 uppercase">{user.role}</strong>.
              </p>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/orders"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
              >
                View Order Details
              </Link>
              <Link
                href="/user"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                My User Hub
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

