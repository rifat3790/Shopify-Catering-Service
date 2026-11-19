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
  updateProfile,
  type User,
} from '@/lib/firebase';
import { UserRole, SUPER_ADMIN_EMAIL } from '@/lib/types';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  name?: string;
  username?: string;
  photoURL: string | null;
  avatar?: string;
  role: UserRole;
  balance: number;
  currentDue: number;
  totalSpent: number;
  department?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLocalUserProfile: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateLocalUserProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('shopify_cached_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // ignore parse error
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('shopify_cached_user');
    }
    return true;
  });

  // Sync user with MongoDB backend with resilient timeout
  const syncWithBackend = async (firebaseUser: User): Promise<AuthUser> => {
    const isSuper = firebaseUser.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Check Firebase Auth Token Claims FIRST for guaranteed authoritative role
    let tokenClaimRole: UserRole | undefined;
    try {
      const idToken = await firebaseUser.getIdTokenResult();
      if (idToken?.claims?.role) {
        tokenClaimRole = idToken.claims.role as UserRole;
      }
    } catch (e) {}

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL,
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const dbUser = json.data;
          const defaultUsername = '@' + (firebaseUser.email || 'member').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
          const nameVal = dbUser.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member';
          const avatarVal = dbUser.avatar || firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameVal)}&background=047857&color=fff`;
          const determinedRole: UserRole = isSuper ? 'super_admin' : (dbUser.role || tokenClaimRole || 'user');

          const freshUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: nameVal,
            name: nameVal,
            username: dbUser.username || defaultUsername,
            photoURL: avatarVal,
            avatar: avatarVal,
            role: determinedRole,
            balance: Number(dbUser.balance) || 0,
            currentDue: Number(dbUser.currentDue) || 0,
            totalSpent: Number(dbUser.totalSpent) || 0,
            department: dbUser.department || (isSuper ? 'Executive Management' : (determinedRole === 'admin' ? 'Admin Team' : 'Shopify Member')),
            phone: dbUser.phone || '',
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('shopify_cached_user', JSON.stringify(freshUser));
          }
          return freshUser;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error && (errJson.error.includes('removed') || errJson.error.includes('deleted'))) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('shopify_cached_user');
            localStorage.removeItem('shopify_demo_user');
          }
          await signOut(auth).catch(() => {});
          setUser(null);
          return null as any;
        }
      }
    } catch (e) {
      console.warn('Backend sync warning (using cached role):', e);
    }

    // Local fallback preserving cached role - NEVER downgrade an admin to 'user'
    let cachedRole: UserRole = 'user';
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('shopify_cached_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role) cachedRole = parsed.role;
        }
      } catch (e) {}
    }

    const effectiveRole: UserRole = isSuper ? 'super_admin' : (tokenClaimRole || user?.role || cachedRole);
    const fallbackUsername = '@' + (firebaseUser.email || 'member').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const fallbackName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member';
    const fallbackAvatar = firebaseUser.photoURL || `https://ui-avatars.com/api/?name=Member&background=047857&color=fff`;
    const fallbackUser: AuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: fallbackName,
      name: fallbackName,
      username: fallbackUsername,
      photoURL: fallbackAvatar,
      avatar: fallbackAvatar,
      role: effectiveRole,
      balance: user?.balance || 0,
      currentDue: user?.currentDue || 0,
      totalSpent: user?.totalSpent || 0,
      department: user?.department || (isSuper ? 'Executive Management' : (effectiveRole === 'admin' ? 'Admin Team' : 'Shopify Member')),
      phone: user?.phone || '',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('shopify_cached_user', JSON.stringify(fallbackUser));
    }
    return fallbackUser;
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      const synced = await syncWithBackend(auth.currentUser);
      setUser(prev => {
        if (!prev) return synced;
        if (
          prev.uid === synced.uid &&
          prev.balance === synced.balance &&
          prev.totalSpent === synced.totalSpent &&
          prev.currentDue === synced.currentDue &&
          prev.role === synced.role &&
          prev.name === synced.name &&
          prev.username === synced.username &&
          prev.avatar === synced.avatar &&
          prev.phone === synced.phone &&
          prev.department === synced.department
        ) {
          return prev;
        }
        return synced;
      });
    }
  };

  useEffect(() => {
    // Clear any legacy demo data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopify_demo_user');
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser && firebaseUser.email) {
        const isSuper = firebaseUser.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

        // Check Firebase token claims for immediate verified role
        let claimRole: UserRole | undefined;
        try {
          const idToken = await firebaseUser.getIdTokenResult();
          if (idToken?.claims?.role) {
            claimRole = idToken.claims.role as UserRole;
          }
        } catch (e) {}

        // Optimistic fast state: NEVER downgrade to 'user'!
        setUser(prev => {
          const resolvedRole: UserRole = isSuper ? 'super_admin' : (claimRole || prev?.role || 'user');
          if (prev) {
            return {
              ...prev,
              role: resolvedRole,
            };
          }
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
            username: '@' + (firebaseUser.email || 'member').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, ''),
            photoURL: firebaseUser.photoURL,
            role: resolvedRole,
            balance: 0,
            currentDue: 0,
            totalSpent: 0,
          };
        });
        setLoading(false);

        // Authoritative background sync with database
        const syncedUser = await syncWithBackend(firebaseUser);
        if (syncedUser) {
          setUser(syncedUser);
        }
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('shopify_cached_user');
        }
        setLoading(false);
      }
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
        if (name && auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, { displayName: name.trim() });
          } catch (e) {
            console.warn('Could not update profile display name:', e);
          }
        }
        const userObj = {
          ...res.user,
          displayName: name?.trim() || res.user.displayName,
        };
        const synced = await syncWithBackend(userObj as User);
        setUser(synced);
      }
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLocalUserProfile = (data: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      if (typeof window !== 'undefined') {
        localStorage.setItem('shopify_cached_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopify_demo_user');
      localStorage.removeItem('shopify_cached_user');
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
        updateLocalUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
