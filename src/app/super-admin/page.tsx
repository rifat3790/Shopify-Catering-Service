'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserRecord, UserRole, SUPER_ADMIN_EMAIL } from '@/lib/types';
import Link from 'next/link';
import { 
  Crown, 
  Users, 
  Wallet, 
  Check, 
  PlusCircle, 
  MinusCircle,
  Edit3,
  Search,
  KeyRound,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  Coins
} from 'lucide-react';

function SuperAdminDashboardContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Balance Management Modal
  const [balanceModalUser, setBalanceModalUser] = useState<UserRecord | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [balanceAmount, setBalanceAmount] = useState<number>(500);

  // New user registration modal
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserDept, setNewUserDept] = useState('Development');
  const [newUserBalance, setNewUserBalance] = useState<number>(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUsers(json.data);
        }
      }
    } catch (e) {
      console.warn('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (targetUser: UserRecord, newRole: UserRole) => {
    setUpdatingId(targetUser.id);
    try {
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id, role: newRole })
      });
      if (!res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
      fetchUsers();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser || balanceAmount < 0) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: balanceModalUser.id,
          balanceAmount: balanceAmount,
          action: balanceAction
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUsers(prev => prev.map(u => u.id === balanceModalUser.id ? json.data : u));
        } else {
          fetchUsers();
        }
        setBalanceModalUser(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openBalanceModal = (u: UserRecord, defaultAction: 'add' | 'deduct' | 'set' = 'add') => {
    setBalanceModalUser(u);
    setBalanceAction(defaultAction);
    setBalanceAmount(defaultAction === 'set' ? u.balance : (defaultAction === 'deduct' ? Math.min(100, u.balance) : 500));
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (newUserRole !== 'user') {
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: json.data.id, role: newUserRole })
            });
          }
          if (newUserBalance > 0) {
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: json.data.id, balanceAmount: newUserBalance, action: 'set' })
            });
          }
          fetchUsers();
          setIsNewUserModalOpen(false);
          setNewUserName('');
          setNewUserEmail('');
          setNewUserRole('user');
          setNewUserBalance(0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchQuery = (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                       (u.email || '').toLowerCase().includes(search.toLowerCase()) || 
                       (u.department || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchQuery && matchRole;
  });

  const totalCompanyBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalLifetimeSpent = users.reduce((acc, u) => acc + (u.totalSpent || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-[1920px] w-full mx-auto">
          
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-[2px] shadow-lg shadow-amber-950/40 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                    {language === 'bn' ? 'সুপার অ্যাডমিন কমান্ড সেন্টার' : 'Super Admin Command Center'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Root Master: {SUPER_ADMIN_EMAIL}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'bn'
                    ? 'যেকোনো ব্যবহারকারীকে Super Admin, Admin, Staff বা সাধারণ ইউজার রোল দিন এবং সবার ব্যালেন্স যোগ, কর্তন ও এডিট করুন'
                    : 'Assign any role to any user, add, deduct, and edit user balances dynamically'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <button
                onClick={() => setIsNewUserModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>{language === 'bn' ? '+ নতুন মেম্বার যুক্ত' : '+ Add User'}</span>
              </button>

              <button
                onClick={fetchUsers}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>রিফ্রেশ</span>
              </button>

              <Link
                href="/admin"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-emerald-300 border border-emerald-800/80 transition-colors"
              >
                {language === 'bn' ? 'অ্যাডমিন কিচেন' : 'Admin Kitchen'}
              </Link>
            </div>
          </div>

          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>{language === 'bn' ? 'মোট আসল ব্যবহারকারী' : 'Real Logged-In Users'}</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold font-serif text-white">{users.length}</p>
              <p className="text-[11px] text-amber-400 mt-1 font-mono">Zero Dummy Accounts</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>{language === 'bn' ? 'মোট সংরক্ষিত ব্যালেন্স' : 'Total Dynamic Balance'}</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-300">৳{totalCompanyBalance.toFixed(2)}</p>
              <p className="text-[11px] text-emerald-400 mt-1">Live MongoDB Balances</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-teal-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>{language === 'bn' ? 'মোট খাবার গ্রহণ' : 'Total Food Consumption'}</span>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-amber-300">৳{totalLifetimeSpent.toFixed(2)}</p>
              <p className="text-[11px] text-teal-400 mt-1">Settled Meal Sales</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>{language === 'bn' ? 'ব্যালেন্স কন্ট্রোল' : 'Balance Manager'}</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Add / Deduct / Edit Active</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Full Admin Privileges</p>
            </div>
          </div>

          {/* Role & Balance Management Section */}
          <div className="rounded-3xl bg-slate-900/90 border border-emerald-900/60 shadow-2xl overflow-hidden backdrop-blur-xl">
            
            {/* Table Header Bar */}
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 border-b border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <span>{language === 'bn' ? 'রোল নির্ধারণ ও ব্যালেন্স কন্ট্রোল (Add, Deduct, Edit)' : 'Role Assignment & Balance Management'}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {language === 'bn' 
                    ? 'সুপার অ্যাডমিন যেকাউকে Super Admin, Admin, Staff বা সাধারণ ইউজার রোল দিতে পারেন এবং ব্যালেন্স যোগ, কর্তন ও এডিট করতে পারেন' 
                    : 'Assign roles to any user and manage balances (Add, Deduct, or directly Edit)'}
                </p>
              </div>

              {/* Filter toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={language === 'bn' ? 'ব্যবহারকারী খুঁজুন...' : 'Search employee...'}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>

            {/* Dynamic User Table */}
            <div className="w-full overflow-x-auto border border-slate-800/50">
              <table className="w-full min-w-[920px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Real User / Member</th>
                    <th className="py-3.5 px-4 sm:px-6">Department</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Catering Balance (৳)</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Lifetime Spent (৳)</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Assigned Role (রোল)</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">Balance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <LuxuryLoader message="Loading member directory..." subMessage="Fetching dynamic balances & real accounts" />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="text-white font-semibold">No real members found</p>
                          <p className="text-xs text-slate-400">
                            {language === 'bn' 
                              ? 'কোনো ডামি অ্যাকাউন্ট নেই। মেম্বাররা লগইন করলে বা উপরে "+ Add User" দিয়ে যোগ করলে এখানে প্রদর্শিত হবে।' 
                              : 'Zero dummy accounts. Real users appear dynamically upon Google/Email sign-in or via "+ Add User" above.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuperAccount = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      const isCurrentSuper = u.role === 'super_admin';
                      const isAdmin = u.role === 'admin';

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Name & Avatar */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=047857&color=fff`}
                                alt={u.name}
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/30"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-white tracking-wide">{u.name}</p>
                                  {isSuperAccount && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      Root Super Admin
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 sm:px-6 text-slate-300 font-medium whitespace-nowrap">
                            {u.department}
                          </td>

                          {/* Balance */}
                          <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                            ৳{u.balance.toFixed(2)}
                          </td>

                          {/* Spent */}
                          <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-medium text-amber-200 whitespace-nowrap">
                            ৳{u.totalSpent.toFixed(2)}
                          </td>

                          {/* Role Selector dropdown */}
                          <td className="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">
                            <select
                              value={u.role}
                              disabled={updatingId === u.id || isSuperAccount}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs border outline-none cursor-pointer transition-all ${
                                isCurrentSuper
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-sm'
                                  : isAdmin
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                                  : 'bg-slate-950 text-slate-200 border-slate-700'
                              } ${isSuperAccount ? 'opacity-90 cursor-not-allowed' : ''}`}
                            >
                              <option value="super_admin">👑 Super Admin</option>
                              <option value="admin">🛡️ Admin</option>
                              <option value="staff">👨‍🍳 Staff</option>
                              <option value="user">👤 Customer / User</option>
                            </select>
                          </td>

                          {/* Balance Actions: Add, Deduct, Edit */}
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openBalanceModal(u, 'add')}
                                title="Add Balance (+)"
                                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+ Add</span>
                              </button>

                              <button
                                onClick={() => openBalanceModal(u, 'deduct')}
                                title="Deduct Balance (-)"
                                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                <span>- Deduct</span>
                              </button>

                              <button
                                onClick={() => openBalanceModal(u, 'set')}
                                title="Set Exact Balance (Edit)"
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* Complete Balance Management Modal (Add, Deduct, Edit Exact) */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  ব্যালেন্স নিয়ন্ত্রণ (Manage Balance)
                </h3>
              </div>
              <button
                onClick={() => setBalanceModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-xs text-slate-300">
                গ্রাহক: <strong className="text-amber-300">{balanceModalUser.name}</strong> ({balanceModalUser.email})
              </p>
              <p className="text-xs text-slate-400">
                বর্তমান ব্যালেন্স: <span className="font-mono font-bold text-emerald-400 text-sm">৳{balanceModalUser.balance.toFixed(2)}</span>
              </p>
            </div>

            {/* Action Tabs: Add | Deduct | Set Exact */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setBalanceAction('add')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  balanceAction === 'add'
                    ? 'bg-emerald-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + যোগ (Add)
              </button>

              <button
                type="button"
                onClick={() => setBalanceAction('deduct')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  balanceAction === 'deduct'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                - কর্তন (Deduct)
              </button>

              <button
                type="button"
                onClick={() => {
                  setBalanceAction('set');
                  setBalanceAmount(balanceModalUser.balance);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  balanceAction === 'set'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✏️ এডিট (Set)
              </button>
            </div>

            <form onSubmit={handleBalanceSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  {balanceAction === 'add' 
                    ? 'কত টাকা যোগ করতে চান? (BDT ৳)' 
                    : (balanceAction === 'deduct' ? 'কত টাকা কর্তন করতে চান? (BDT ৳)' : 'নতুন মোট ব্যালেন্স কত নির্ধারণ করতে চান? (BDT ৳)')}
                </label>

                {balanceAction !== 'set' && (
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[100, 200, 500, 1000].map(amt => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setBalanceAmount(amt)}
                        className={`py-1 text-xs font-bold rounded-lg ${
                          balanceAmount === amt ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-emerald-400 font-bold text-base focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Preview of new balance */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">নতুন ব্যালেন্স দাঁড়াবে:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  ৳{balanceAction === 'add' 
                    ? (balanceModalUser.balance + Number(balanceAmount)).toFixed(2)
                    : (balanceAction === 'deduct' 
                        ? Math.max(0, balanceModalUser.balance - Number(balanceAmount)).toFixed(2)
                        : Number(balanceAmount).toFixed(2))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg ${
                    balanceAction === 'deduct'
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950'
                  }`}
                >
                  {balanceAction === 'add' ? 'ব্যালেন্স যোগ করুন' : (balanceAction === 'deduct' ? 'ব্যালেন্স কর্তন করুন' : 'ব্যালেন্স পরিবর্তন করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New User Creation Modal */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {language === 'bn' ? 'নতুন ব্যবহারকারী নিবন্ধন' : 'Register New Team Account'}
              </h3>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  নাম (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Tanvir Hasan"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  ইমেইল অ্যাড্রেস *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="tanvir@shopify.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    প্রাথমিক রোল (Role)
                  </label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="user">👤 User</option>
                    <option value="staff">👨‍🍳 Staff</option>
                    <option value="admin">🛡️ Admin</option>
                    <option value="super_admin">👑 Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    প্রাথমিক ব্যালেন্স (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newUserBalance}
                    onChange={e => setNewUserBalance(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <AuthGuard allowedRoles={['super_admin']}>
      <SuperAdminDashboardContent />
    </AuthGuard>
  );
}
