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
import { UserRole, SUPER_ADMIN_EMAIL } from '@/lib/types';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  balance: number;
  currentDue: number;
  totalSpent: number;
  department?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user with MongoDB backend
  const syncWithBackend = async (firebaseUser: User): Promise<AuthUser> => {
    const isSuper = firebaseUser.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const dbUser = json.data;
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: dbUser.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
            photoURL: dbUser.avatar || firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.name || 'User')}&background=047857&color=fff`,
            role: isSuper ? 'super_admin' : (dbUser.role || 'user'),
            balance: Number(dbUser.balance) || 0,
            currentDue: Number(dbUser.currentDue) || 0,
            totalSpent: Number(dbUser.totalSpent) || 0,
            department: dbUser.department || (isSuper ? 'Executive Management' : 'Shopify Member'),
          };
        }
      }
    } catch (e) {
      console.warn('Backend sync error:', e);
    }

    // Local fallback if backend is unreachable
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
      photoURL: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=Member&background=047857&color=fff`,
      role: isSuper ? 'super_admin' : 'user',
      balance: 0,
      currentDue: 0,
      totalSpent: 0,
      department: isSuper ? 'Executive Management' : 'Shopify Member',
    };
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      const synced = await syncWithBackend(auth.currentUser);
      setUser(synced);
    }
  };

  useEffect(() => {
    // Clear any legacy demo data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopify_demo_user');
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser && firebaseUser.email) {
        const syncedUser = await syncWithBackend(firebaseUser);
        setUser(syncedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user && res.user.email) {
        const synced = await syncWithBackend(res.user);
        setUser(synced);
      }
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
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user && res.user.email) {
        const synced = await syncWithBackend(res.user);
        setUser(synced);
      }
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
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user && res.user.email) {
        const synced = await syncWithBackend(res.user);
        setUser(synced);
      }
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopify_demo_user');
    }
    await signOut(auth);
    setUser(null);
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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
