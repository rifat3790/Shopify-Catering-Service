'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { 
  UtensilsCrossed, 
  TableProperties, 
  MenuSquare, 
  Calculator, 
  LogOut, 
  User as UserIcon, 
  PlusCircle, 
  Languages, 
  Sparkles, 
  ShieldCheck, 
  ChevronDown, 
  Crown, 
  Wallet, 
  LayoutDashboard,
  MessageSquare
} from 'lucide-react';

interface NavbarProps {
  onOpenNewOrder?: () => void;
}

export default function Navbar({ onOpenNewOrder }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isSuper = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuper;

  const navLinks = [
    { href: '/menu', label: language === 'bn' ? 'ক্যাটারিং মেনু' : 'Menu', icon: MenuSquare, show: true },
    { href: '/chat', label: language === 'bn' ? 'টিম চ্যাট ও কল' : 'Team Chat', icon: MessageSquare, show: !!user },
    { href: '/tracker', label: language === 'bn' ? 'অর্ডার ট্র্যাকার' : 'Live Tracker', icon: TableProperties, show: isAdmin },
    { href: '/pos', label: language === 'bn' ? 'কাউন্টার পিওএস' : 'Express POS', icon: Calculator, show: isAdmin },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-emerald-900/40 text-slate-100 shadow-xl shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo with Pure SVG */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 p-[2px] shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center border border-amber-500/30">
                <UtensilsCrossed className="w-6 h-6 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                  Shopify Catering
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/80 font-medium tracking-wide">
                {language === 'bn' ? 'দৈনিক খাবার ও ক্যাটারিং ট্র্যাকার' : 'Premium Corporate Catering Portal'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.filter(l => l.show).map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-900/50 text-amber-300 border border-emerald-500/40 shadow-sm shadow-emerald-900/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Role-Specific Direct Navigation */}
            {isSuper && (
              <Link
                href="/super-admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  pathname === '/super-admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-amber-300 hover:bg-amber-500/10 border border-amber-500/40'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  pathname === '/admin'
                    ? 'bg-emerald-600 text-slate-950 shadow-md'
                    : 'text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Hub</span>
              </Link>
            )}

            {user && (
              <Link
                href="/user"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/user'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'bn' ? 'আমার পোর্টাল' : 'My Hub'}</span>
              </Link>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live User Balance Pill */}
            {user && (
              <Link
                href="/user"
                title="Your Current Catering Wallet Balance"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 transition-colors shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-mono font-bold text-emerald-300">
                  ৳{(user.balance || 0).toFixed(2)}
                </span>
              </Link>
            )}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              title="Toggle English / বাংলা"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-emerald-300 border border-emerald-900/60 transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'bn' ? 'বাং' : 'EN'}</span>
            </button>

            {/* Quick Add Order Button */}
            {user && onOpenNewOrder && (
              <button
                onClick={onOpenNewOrder}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>{language === 'bn' ? 'নতুন অর্ডার' : 'New Order'}</span>
              </button>
            )}

            {/* User Profile / Auth State */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-900/50 transition-colors"
                >
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Staff')}&background=047857&color=fff`}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-amber-400/40"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-2xl shadow-2xl border border-emerald-800/60 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {user.role}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          ৳{(user.balance || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Role Dashboards in dropdown */}
                    {isSuper && (
                      <Link
                        href="/super-admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-amber-300 hover:bg-slate-800 font-semibold"
                      >
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>{language === 'bn' ? 'সুপার অ্যাডমিন ড্যাশবোর্ড' : 'Super Admin Dashboard'}</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-emerald-300 hover:bg-slate-800 font-semibold"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>{language === 'bn' ? 'অ্যাডমিন কিচেন' : 'Admin Operations'}</span>
                      </Link>
                    )}

                    <Link
                      href="/user"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 font-semibold"
                    >
                      <LayoutDashboard className="w-4 h-4 text-sky-400" />
                      <span>{language === 'bn' ? 'আমার খাবার ও ব্যালেন্স' : 'My User Dashboard'}</span>
                    </Link>

                    <Link
                      href="/chat"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 font-semibold"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bn' ? 'টিম চ্যাট ও কল' : 'Team Connect & Chat'}</span>
                    </Link>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'bn' ? 'লগইন' : 'Sign In'}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around py-2.5 px-2 bg-slate-900/95 border-t border-slate-800 text-xs">
        {navLinks.filter(l => l.show).map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg font-medium transition-colors ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
        {user && (
          <Link
            href="/user"
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg font-medium ${
              pathname === '/user' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px]">{language === 'bn' ? 'ব্যালেন্স' : 'Balance'}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
