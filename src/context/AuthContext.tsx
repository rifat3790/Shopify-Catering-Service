'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from '@/lib/firebase';
import { UserRole } from '@/lib/types';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  balance: number;
  currentDue: number;
  department?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setDemoUser: (role: UserRole, customName?: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  setDemoUser: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user balance from backend
  const fetchUserBalance = async (userName: string, currentRole: UserRole, currentEmail?: string | null) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            balance: json.data.balance,
            currentDue: json.data.currentDue,
            department: json.data.department,
            role: json.data.role || currentRole
          };
        }
      }
    } catch (e) {
      // fallback
    }
    return null;
  };

  const refreshUser = async () => {
    if (!user) return;
    const synced = await fetchUserBalance(user.displayName || 'Shamim', user.role, user.email);
    if (synced) {
      setUser(prev => prev ? { ...prev, ...synced } : null);
    }
  };

  useEffect(() => {
    const savedDemo = localStorage.getItem('shopify_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser(parsed);
        setLoading(false);
        // refresh balance in background
        fetchUserBalance(parsed.displayName, parsed.role).then(synced => {
          if (synced) {
            setUser(prev => prev ? { ...prev, ...synced } : null);
          }
        });
      } catch (e) {
        localStorage.removeItem('shopify_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const isSuper = firebaseUser.email?.includes('super') || firebaseUser.email === 'rifat@shopify.com';
        const isAdmin = firebaseUser.email?.includes('admin');
        const role: UserRole = isSuper ? 'super_admin' : (isAdmin ? 'admin' : 'user');
        
        const mappedUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'User')}&background=047857&color=fff`,
          role,
          balance: role === 'super_admin' ? 5000 : (role === 'admin' ? 2400 : 450),
          currentDue: 0,
        };
        setUser(mappedUser);
        localStorage.removeItem('shopify_demo_user');
      } else if (!localStorage.getItem('shopify_demo_user')) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Email Sign In Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('shopify_demo_user');
    await signOut(auth);
    setUser(null);
  };

  const setDemoUser = (role: UserRole, customName?: string) => {
    let displayName = customName || 'Shamim';
    let balance = 450;
    let dept = 'Development';

    if (role === 'super_admin') {
      displayName = 'Rifat (Super Admin)';
      balance = 5000;
      dept = 'Executive Board';
    } else if (role === 'admin') {
      displayName = 'Tanvir Hasan (Admin)';
      balance = 2400;
      dept = 'Catering Management';
    } else if (role === 'staff') {
      displayName = 'Counter Cashier';
      balance = 1000;
      dept = 'Kitchen & Counter';
    } else {
      if (customName === 'Shagor') balance = 620;
      else if (customName === 'Refayet') balance = 550;
      else if (customName === 'Ismail') balance = 310;
    }

    const demo: AuthUser = {
      uid: `demo-${role}-${Date.now()}`,
      email: `${role}@shopifycatering.com`,
      displayName,
      photoURL: role === 'super_admin'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : (role === 'admin' 
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
      role,
      balance,
      currentDue: 0,
      department: dept,
    };
    setUser(demo);
    localStorage.setItem('shopify_demo_user', JSON.stringify(demo));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        setDemoUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
