'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole, RoutePermissions, DEFAULT_ROUTE_PERMISSIONS } from '@/lib/types';
import Link from 'next/link';
import { ShieldAlert, Lock, ArrowRight, ShieldX, Clock, RefreshCw, LogOut } from 'lucide-react';
import LuxuryLoader from '@/components/LuxuryLoader';

function PendingApprovalScreen({ user, onRefresh, onLogout }: { user: any; onRefresh: () => Promise<void>; onLogout: () => Promise<void> }) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      onRefresh().catch(() => {});
    }, 7000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
      <div className="text-center space-y-6 max-w-lg w-full p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500 blur-sm rounded-full" />

        {/* Pulsing Status Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-75" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-950/60 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-xl">
            <Clock className="w-8 h-8 animate-pulse text-amber-400" />
          </div>
        </div>

        {/* User Profile Card Snippet */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3.5 text-left">
          <img
            src={user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Member')}&background=047857&color=fff`}
            alt={user.name || 'Member'}
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-500/40 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-sm truncate">{user.name || user.displayName || 'New Member'}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pending Approval
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Explanatory Text */}
        <div className="space-y-2">
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-white">
            অ্যাকাউন্ট অনুমোদনের অপেক্ষায়
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            আপনার রেজিস্ট্রেশন সফল হয়েছে। সিকিউরিটি ও ক্যাটারিং কোটা নিশ্চিত করতে 
            <strong className="text-amber-300"> অ্যাডমিন বা সুপার অ্যাডমিনের </strong> 
            অনুমোদন প্রয়োজন।
          </p>
          <p className="text-[11px] text-slate-500 font-sans">
            (Once approved by Admin, this screen will automatically refresh and unlock your dashboard.)
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-slate-950 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'যাচাই করা হচ্ছে...' : 'স্ট্যাটাস চেক করুন (Check Status)'}</span>
          </button>

          <button
            onClick={() => onLogout()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all hover:scale-105"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>লগআউট (Sign Out)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading, logout, refreshUser } = useAuth();
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

  // 1. Pending User Approval Check - New users cannot access until approved
  if (!isSuper && user.status === 'pending') {
    return (
      <PendingApprovalScreen
        user={user}
        onRefresh={refreshUser}
        onLogout={logout}
      />
    );
  }

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

