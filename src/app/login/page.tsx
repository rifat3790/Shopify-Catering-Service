'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserRole } from '@/lib/types';
import Link from 'next/link';
import { 
  UtensilsCrossed, 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Crown,
  UserCheck,
  AlertCircle,
  User
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, setDemoUser } = useAuth();
  const { language } = useLanguage();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (role: UserRole, customName?: string) => {
    setDemoUser(role, customName);
    if (role === 'super_admin') router.push('/super-admin');
    else if (role === 'admin') router.push('/admin');
    else router.push('/user');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-emerald-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 p-[2px]">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center border border-amber-500/30">
                <UtensilsCrossed className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </Link>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white">
            Shopify Catering Service
          </h1>
          <p className="text-xs text-emerald-400/90">
            {language === 'bn' ? 'লাক্সারি ক্যাটারিং পোর্টাল অথেনটিকেশন' : 'Role-Based Catering Portal Access'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Role Direct Logins for Testing */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/60 space-y-2.5">
          <p className="text-[11px] text-center text-slate-400 font-bold uppercase tracking-wider">
            {language === 'bn' ? '১-ক্লিকে রোল সিলেক্ট করে লগইন করুন' : 'Instant Role Quick-Access'}
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemo('super_admin')}
              className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Super Admin</span>
            </button>

            <button
              onClick={() => handleDemo('admin')}
              className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin</span>
            </button>

            <button
              onClick={() => handleDemo('user', 'Shamim')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
            >
              <User className="w-4 h-4 text-sky-400" />
              <span>User / Client</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">
            {language === 'bn' ? 'অথবা ফায়ারবেস লগইন' : 'or Firebase Auth'}
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white border border-slate-700 font-semibold text-xs flex items-center justify-center gap-3 shadow-md hover:border-slate-600 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{language === 'bn' ? 'Google দিয়ে সাইন ইন' : 'Sign in with Google'}</span>
        </button>

        {/* Email Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                {language === 'bn' ? 'নাম' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Shamim"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
              {language === 'bn' ? 'ইমেইল' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@shopify.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
              {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all"
          >
            {isSignUp ? (language === 'bn' ? 'রেজিস্ট্রেশন' : 'Sign Up') : (language === 'bn' ? 'লগইন করুন' : 'Sign In')}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-amber-300 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}
