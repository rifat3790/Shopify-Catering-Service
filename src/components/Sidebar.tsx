'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import ProfileModal from './ProfileModal';
import QuickOrderModal from './QuickOrderModal';
import { RoutePermissions, DEFAULT_ROUTE_PERMISSIONS } from '@/lib/types';
import { 
  UtensilsCrossed, 
  LayoutDashboard, 
  TableProperties, 
  MenuSquare, 
  Users, 
  Calculator, 
  Crown, 
  User, 
  Wallet, 
  PlusCircle, 
  Languages, 
  LogOut, 
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  LogIn,
  MessageSquare,
  Edit3,
  Receipt,
  Lock
} from 'lucide-react';

interface SidebarProps {
  onOpenNewOrder?: () => void;
}

export default function Sidebar({ onOpenNewOrder }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [internalOrderOpen, setInternalOrderOpen] = useState(false);
  const [routePerms, setRoutePerms] = useState<RoutePermissions>(DEFAULT_ROUTE_PERMISSIONS);

  useEffect(() => {
    fetch('/api/admin/permissions')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setRoutePerms(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const isSuper = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuper;

  // Check if a specific route is allowed for the user's role
  const isRouteAllowed = (path: string): boolean => {
    if (!user) return path === '/menu'; // unauthenticated can view menu
    if (isSuper) return true; // Super admin can access everything
    const role = user.role || 'user';
    const allowedList = role === 'admin' ? (routePerms.admin || []) : (routePerms.user || []);
    return allowedList.includes(path);
  };

  const navItems = [
    {
      href: '/menu',
      labelEn: 'Digital Menu',
      labelBn: 'ক্যাটারিং মেনু',
      icon: MenuSquare,
      badge: '',
      show: true,
    },
    {
      href: '/orders',
      labelEn: 'Order Details',
      labelBn: 'অর্ডার ডিটেইলস',
      icon: Receipt,
      badge: 'All',
      show: !!user, // Available to all authenticated users
    },
    {
      href: '/chat',
      labelEn: 'Team & Voice Chat',
      labelBn: 'টিম চ্যাট ও কল',
      icon: MessageSquare,
      badge: 'Live',
      show: !!user,
    },
    {
      href: '/tracker',
      labelEn: 'Live Ledger Tracker',
      labelBn: 'অর্ডার ট্র্যাকার',
      icon: TableProperties,
      badge: 'Live',
      show: isAdmin || isRouteAllowed('/tracker'),
    },
    {
      href: '/members',
      labelEn: 'Team Directory',
      labelBn: 'মেম্বার তালিকা',
      icon: Users,
      badge: '',
      show: isAdmin || isRouteAllowed('/members'),
    },
    {
      href: '/pos',
      labelEn: 'Express POS',
      labelBn: 'কাউন্টার পিওএস',
      icon: Calculator,
      badge: 'Fast',
      show: isAdmin || isRouteAllowed('/pos'),
    },
  ];

  // Dynamic role-based portal links
  const rolePortals = [
    {
      href: '/super-admin',
      labelEn: 'Super Admin',
      labelBn: 'সুপার অ্যাডমিন',
      icon: Crown,
      color: 'text-amber-400',
      show: isSuper, // ONLY SUPER ADMIN
    },
    {
      href: '/admin',
      labelEn: 'Admin Kitchen',
      labelBn: 'অ্যাডমিন কিচেন',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      show: isAdmin, // Super Admin & Admin
    },
    {
      href: '/user',
      labelEn: 'My Catering Hub',
      labelBn: 'আমার খাবার ও ব্যালেন্স',
      icon: User,
      color: 'text-sky-400',
      show: !!user, // Available to all logged-in users
    },
  ].filter(p => p.show);

  const handleOrderClick = () => {
    if (onOpenNewOrder) {
      onOpenNewOrder();
    } else {
      setInternalOrderOpen(true);
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-emerald-900/40 text-slate-100 select-none">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-emerald-900/40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 p-[2px] shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center border border-amber-500/30">
              <UtensilsCrossed className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                Shopify Catering
              </span>
            </div>
            <p className="text-[10px] text-emerald-400/80 font-medium tracking-wide">
              {language === 'bn' ? 'এক্সিকিউটিভ ফুড পোর্টাল' : 'Executive Enterprise Portal'}
            </p>
          </div>
        </Link>
      </div>

      {/* Dynamic User Balance Card */}
      <div className="px-5 py-4">
        {user ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-700/50 shadow-lg transition-all group space-y-2.5">
            {/* User Profile Header with @username and Edit Profile */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=047857&color=fff`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-xs text-white truncate leading-tight">
                    {user.displayName || 'Member'}
                  </p>
                  <p className="text-[10px] text-amber-400 font-mono truncate leading-tight">
                    {user.username || `@${user.email?.split('@')[0] || 'user'}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                title={language === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit Profile'}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/60 text-slate-300 hover:text-amber-300 border border-slate-700 transition-all hover:scale-105 shrink-0"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {/* Wallet Balance Link */}
            <Link
              href="/user"
              className="flex items-center justify-between pt-2 border-t border-slate-800/80 hover:opacity-90 transition-opacity"
            >
              <div>
                <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-amber-400" />
                  <span>{language === 'bn' ? 'ব্যালেন্স' : 'Balance'}</span>
                </span>
                <span className="text-lg font-extrabold font-mono text-emerald-400 group-hover:text-amber-300 transition-colors">
                  ৳{(user.balance || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {user.role}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>লগইন করুন (Sign In)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* Quick Add Order CTA */}
        {user && (
          <button
            onClick={handleOrderClick}
            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>{language === 'bn' ? 'নতুন খাবার অর্ডার' : 'New Quick Order'}</span>
          </button>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {language === 'bn' ? 'মডিউল ও মেনু' : 'Navigation'}
        </p>

        {navItems.filter(item => item.show).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const allowed = isRouteAllowed(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-950 to-slate-900 text-amber-300 border border-emerald-500/50 shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              } ${!allowed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{language === 'bn' ? item.labelBn : item.labelEn}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {!allowed && (
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Locked</span>
                  </span>
                )}
                {item.badge && allowed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Role Portals Section */}
        {rolePortals.length > 0 && (
          <div className="pt-4">
            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'bn' ? 'অনুমোদিত ড্যাশবোর্ড' : 'Your Portals'}
            </p>

            {rolePortals.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span>{language === 'bn' ? item.labelBn : item.labelEn}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-emerald-300 border border-slate-800 transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'bn' ? 'বাংলা ➔ EN' : 'EN ➔ বাং'}</span>
          </button>

          {/* Logout / Switch */}
          {user ? (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-amber-300 hover:underline"
            >
              লগইন
            </Link>
          )}
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0 z-40">
        {content}
      </aside>

      {/* Mobile Top Navbar with Hamburger */}
      <div className="lg:hidden sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-emerald-900/40 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-900/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-white text-base">Shopify Catering</span>
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/user"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-600/60 font-mono font-bold text-xs text-emerald-300"
            >
              <Wallet className="w-3 h-3 text-amber-400" />
              <span>৳{(user.balance || 0).toFixed(0)}</span>
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 h-full bg-slate-950 shadow-2xl relative animate-in slide-in-from-left">
            {content}
          </div>
          <div
            className="flex-1 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* User Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Internal Quick Order Modal for anywhere on any page */}
      <QuickOrderModal
        isOpen={internalOrderOpen}
        onClose={() => setInternalOrderOpen(false)}
        onSubmit={async (data) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          alert(language === 'bn' ? 'অর্ডার সফলভাবে ডাটাবেজে যুক্ত হয়েছে!' : 'Order added and saved to database successfully!');
          window.location.reload();
        }}
      />
    </>
  );
}
