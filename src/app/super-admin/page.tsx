'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserRecord, UserRole, initialUsers } from '@/lib/types';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Crown, 
  Users, 
  Wallet, 
  Check, 
  ArrowUpDown, 
  PlusCircle, 
  Sparkles, 
  Search,
  Filter,
  Layers,
  KeyRound,
  TrendingUp,
  Receipt
} from 'lucide-react';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [balanceModalUser, setBalanceModalUser] = useState<UserRecord | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<number>(500);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUsers(json.data);
        }
      }
    } catch (e) {
      console.warn('Using cached users');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
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

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser || balanceAmount <= 0) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: balanceModalUser.id,
          balanceDelta: balanceAmount,
          action: 'add'
        })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === balanceModalUser.id ? { ...u, balance: u.balance + balanceAmount } : u));
        setBalanceModalUser(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchQuery = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchQuery && matchRole;
  });

  const totalCompanyBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalLifetimeSpent = users.reduce((acc, u) => acc + (u.totalSpent || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-[2px] shadow-lg shadow-amber-950/40">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                  {language === 'bn' ? 'সুপার অ্যাডমিন কমান্ড সেন্টার' : 'Super Admin Command Center'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Executive Root
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'bn'
                  ? 'ব্যবহারকারীর ভূমিকা নির্ধারণ (Role Assignment), ব্যালেন্স সমন্বয় এবং প্রাতিষ্ঠানিক নিয়ন্ত্রণ'
                  : 'Assign user roles (Super Admin, Admin, Staff, User), manage company balances, and root access'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-emerald-300 border border-emerald-800/80 transition-colors"
            >
              {language === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'Admin Dashboard'}
            </Link>
            <Link
              href="/user"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition-colors"
            >
              {language === 'bn' ? 'ইউজার পোর্টাল' : 'User Portal'}
            </Link>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>{language === 'bn' ? 'মোট ব্যবহারকারী' : 'Total Employees'}</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-serif text-white">{users.length}</p>
            <p className="text-[11px] text-amber-400 mt-1 font-mono">Active Catering Accounts</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>{language === 'bn' ? 'মোট সংরক্ষিত ব্যালেন্স' : 'Total Wallet Balances'}</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-300">৳{totalCompanyBalance.toFixed(2)}</p>
            <p className="text-[11px] text-emerald-400 mt-1">Available Catering Funds</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-teal-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>{language === 'bn' ? 'লাইফটাইম ক্যাটারিং সেলস' : 'Lifetime Catering Spent'}</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-amber-300">৳{totalLifetimeSpent.toFixed(2)}</p>
            <p className="text-[11px] text-teal-400 mt-1">Total Consumed Meals</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>{language === 'bn' ? 'সিস্টেম স্ট্যাটাস' : 'System Engine'}</span>
              <ShieldAlert className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-base font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next.js 15 & Vercel Ready</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">RBAC Security Enabled</p>
          </div>
        </div>

        {/* Role & Balance Management Section */}
        <div className="rounded-3xl bg-slate-900/90 border border-emerald-900/60 shadow-2xl overflow-hidden backdrop-blur-xl">
          
          {/* Table Header Bar */}
          <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 border-b border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>{language === 'bn' ? 'রোল নির্ধারণ ও ব্যালেন্স কন্ট্রোল' : 'Role Assignment & Balance Management'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn' 
                  ? 'সুপার অ্যাডমিন যেকাউকে Super Admin, Admin, Staff বা সাধারণ ইউজার রোল দিতে পারেন' 
                  : 'Super Admin can assign or promote any member to Super Admin, Admin, Staff or User'}
              </p>
            </div>

            {/* Filter toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={language === 'bn' ? 'ব্যবহারকারী খুঁজুন...' : 'Search employee...'}
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
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

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Employee / Customer</th>
                  <th className="py-3 px-4 sm:px-6">Department</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Catering Balance (৳)</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Lifetime Spent (৳)</th>
                  <th className="py-3 px-4 sm:px-6 text-center">Assigned Role (রোল)</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.map((u) => {
                  const isCurrentSuper = u.role === 'super_admin';
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/30"
                          />
                          <div>
                            <p className="font-bold text-white tracking-wide">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-300 font-medium">
                        {u.department}
                      </td>

                      {/* Balance (Everyone can see balance!) */}
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-emerald-400 text-sm">
                        ৳{u.balance.toFixed(2)}
                      </td>

                      {/* Spent */}
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-medium text-amber-200">
                        ৳{u.totalSpent.toFixed(2)}
                      </td>

                      {/* Role Selector dropdown */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <select
                          value={u.role}
                          disabled={updatingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border outline-none cursor-pointer transition-all ${
                            isCurrentSuper
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-sm'
                              : isAdmin
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                              : 'bg-slate-950 text-slate-200 border-slate-700'
                          }`}
                        >
                          <option value="super_admin">👑 Super Admin</option>
                          <option value="admin">🛡️ Admin</option>
                          <option value="staff">👨‍🍳 Staff</option>
                          <option value="user">👤 Customer / User</option>
                        </select>
                      </td>

                      {/* Add Balance Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => setBalanceModalUser(u)}
                          className="px-3 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ ব্যালেন্স</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Add Balance Modal */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {language === 'bn' ? 'ব্যালেন্স রিচার্জ / অ্যাড করুন' : 'Add Catering Balance'}
              </h3>
              <button
                onClick={() => setBalanceModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              গ্রাহক: <strong className="text-amber-300">{balanceModalUser.name}</strong> ({balanceModalUser.department})
            </p>

            <form onSubmit={handleAddBalance} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  টাকার পরিমাণ (BDT ৳)
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[200, 500, 1000].map(amt => (
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
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-emerald-400 font-bold text-base focus:outline-none focus:border-amber-400"
                />
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs"
                >
                  ব্যালেন্স যোগ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
