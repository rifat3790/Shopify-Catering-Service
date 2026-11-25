'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader, { LuxurySpinnerIcon } from '@/components/LuxuryLoader';
import QuickOrderModal from '@/components/QuickOrderModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserRecord, SUPER_ADMIN_EMAIL } from '@/lib/types';
import { getClientCache, setClientCache } from '@/lib/clientCache';
import {
  Users,
  Search,
  Plus,
  Wallet,
  Utensils,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Edit3,
  Coins,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

function MembersPageContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  // Instant 0ms cache initialize
  const [members, setMembers] = useState<UserRecord[]>(() => {
    return getClientCache<UserRecord[]>('members_list') || [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getClientCache<UserRecord[]>('members_list');
    return !cached || cached.length === 0;
  });
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusTab, setStatusTab] = useState<'all' | 'approved' | 'pending'>('all');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedOrderMember, setSelectedOrderMember] = useState<string | null>(null);

  // Super Admin delete member state
  const [deleteModalUser, setDeleteModalUser] = useState<UserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isSuper = user?.role === 'super_admin';
  const isAdminOrSuper = isSuper || user?.role === 'admin';

  // Balance & Due modal
  const [balanceModalUser, setBalanceModalUser] = useState<UserRecord | null>(null);
  const [manageMode, setManageMode] = useState<'balance' | 'due'>('balance');
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [balanceAmount, setBalanceAmount] = useState<number>(500);
  const [dueAction, setDueAction] = useState<'set' | 'add' | 'deduct' | 'clear'>('set');
  const [dueAmount, setDueAmount] = useState<number>(0);

  // Form states for new member
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Development');
  const [newBalance, setNewBalance] = useState<number>(0);

  const fetchMembers = async (silent = false) => {
    if (!silent && (!members || members.length === 0)) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMembers(json.data);
          setClientCache('members_list', json.data);
        }
      }
    } catch (e) {
      console.warn('Error fetching members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(true);
  }, []);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          allowRevive: true,
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && newBalance > 0) {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: json.data.id,
              balanceAmount: newBalance,
              action: 'set'
            })
          });
        }
        fetchMembers();
        setIsAddMemberOpen(false);
        setNewName('');
        setNewEmail('');
        setNewBalance(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveMember = async (targetUser: UserRecord) => {
    try {
      setMembers(prev => prev.map(m => m.id === targetUser.id ? { ...m, status: 'approved' } : m));
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id, email: targetUser.email, status: 'approved' })
      });
      if (!res.ok) {
        fetchMembers();
      }
    } catch (e) {
      fetchMembers();
    }
  };

  const openBalanceModal = (u: UserRecord, action: 'add' | 'deduct' | 'set' = 'add', mode: 'balance' | 'due' = 'balance') => {
    setBalanceModalUser(u);
    setManageMode(mode);
    setBalanceAction(action);
    setBalanceAmount(action === 'set' ? u.balance : (action === 'deduct' ? Math.min(100, u.balance) : 500));
    setDueAmount(Number(u.currentDue) || 0);
    setDueAction('set');
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser) return;

    try {
      const payload: any = { userId: balanceModalUser.id };
      if (manageMode === 'due') {
        payload.dueAmount = dueAmount;
        payload.dueAction = dueAction;
      } else {
        payload.balanceAmount = balanceAmount;
        payload.action = balanceAction;
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMembers(prev => {
            const next = prev.map(m => m.id === balanceModalUser.id ? json.data : m);
            setClientCache('members_list', next);
            return next;
          });
        } else {
          fetchMembers();
        }
        setBalanceModalUser(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteModalUser) return;
    const target = deleteModalUser;
    const previousMembers = members;

    // Instant 0ms optimistic removal so admin never waits or refreshes repeatedly
    const nextList = members.filter(m => m.id !== target.id && m.email !== target.email);
    setMembers(nextList);
    setClientCache('members_list', nextList);
    setDeleteModalUser(null);
    setDeleteError('');

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(target.id)}?email=${encodeURIComponent(target.email)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!json.success) {
        // Revert only if backend failed
        setMembers(previousMembers);
        setClientCache('members_list', previousMembers);
        setDeleteError(json.error || 'Failed to delete member from database');
        setDeleteModalUser(target);
      }
    } catch (err: any) {
      setMembers(previousMembers);
      setClientCache('members_list', previousMembers);
      setDeleteError(err.message || 'Error deleting member');
      setDeleteModalUser(target);
    } finally {
      setIsDeleting(false);
    }
  };

  const departments = ['All', 'Development', 'Marketing', 'Design & UX', 'Engineering', 'Operations', 'Support', 'Logistics'];

  const pendingCount = members.filter(m => m.status === 'pending').length;
  const approvedCount = members.filter(m => m.status !== 'pending').length;
  const onlineCount = members.filter(m => m.status !== 'pending' && m.isOnline).length;
  const uniqueDeptsCount = new Set(members.filter(m => m.status !== 'pending').map(m => m.department).filter(Boolean)).size;

  const filteredMembers = members.filter(m => {
    // Non-admins viewing Team Directory only see active/approved team members
    if (!isAdminOrSuper && m.status === 'pending') return false;

    const matchSearch =
      (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = departmentFilter === 'All' ? true : (m.department || '').toLowerCase().includes(departmentFilter.toLowerCase());
    const matchStatus = !isAdminOrSuper
      ? true
      : statusTab === 'all'
      ? true
      : statusTab === 'pending'
      ? m.status === 'pending'
      : m.status !== 'pending';
    return matchSearch && matchDept && matchStatus;
  });

  const totalMembersBalance = members.reduce((sum, m) => sum + (Number(m.balance) || 0), 0);
  const totalLifetimeSpent = members.reduce((sum, m) => sum + (Number(m.totalSpent) || 0), 0);
  const totalMembersDue = members.reduce((sum, m) => sum + (Number(m.currentDue) || 0), 0);
  const dueMembersCount = members.filter(m => (Number(m.currentDue) || 0) > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      <Sidebar onOpenNewOrder={() => setSelectedOrderMember('Member')} />

      <main className="flex-1 w-full min-w-0 px-3.5 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-emerald-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 p-[2px] shadow-lg shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold font-serif text-slate-900 dark:text-white">
                  {isAdminOrSuper
                    ? (language === 'bn' ? 'মেম্বার তালিকা ও ক্যাটারিং হিসাব' : 'Team Member Directory & Balances')
                    : (language === 'bn' ? 'টিম মেম্বার ডিরেক্টরি' : 'Team Member Directory')}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  {isAdminOrSuper ? members.length : approvedCount} Members
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdminOrSuper
                  ? (language === 'bn'
                      ? 'সকল মেম্বারের রিয়েল-টাইম ব্যালেন্স, যোগ/কর্তন/এডিট এবং সরাসরি খাবারের অর্ডার'
                      : 'Manage all team members, individual meal balances (add, deduct, edit), and orders')
                  : (language === 'bn'
                      ? 'টিমের সকল সক্রিয় মেম্বারের তালিকা, ডিপার্টমেন্ট ও লাইভ চ্যাট/কল'
                      : 'View active team members, departments, online status & direct messaging')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => fetchMembers()}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
            {isAdminOrSuper && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{language === 'bn' ? 'নতুন মেম্বার যুক্ত করুন' : 'Add New Member'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Analytics Cards (Full Financial KPIs for Admin/Super Admin, Clean Team Directory Stats for Regular Users) */}
        {isAdminOrSuper ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-emerald-600/30 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-2">
                <span>{language === 'bn' ? 'মোট মেম্বার ব্যালেন্স' : 'Total Member Wallet Funds'}</span>
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">৳{totalMembersBalance.toFixed(2)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">
                {totalMembersBalance > 0
                  ? (language === 'bn' ? 'রিফ্রেশমেন্টের জন্য ব্যালেন্স প্রস্তুত' : 'Available for refreshments')
                  : (language === 'bn' ? 'সকল ওয়ালেট ব্যালেন্স শূন্য' : 'Zero Available Funds (৳0.00)')}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-amber-500/30 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-2">
                <span>{language === 'bn' ? 'মোট ক্যাটারিং খরচ' : 'Total Lifetime Food Spent'}</span>
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-300">৳{totalLifetimeSpent.toFixed(2)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">Settled Catering Orders</p>
            </div>

            <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900/90 border shadow-xs ${totalMembersDue > 0 ? 'border-rose-300/80 dark:border-rose-500/40' : 'border-teal-300/80 dark:border-teal-500/30'}`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-2">
                <span>{language === 'bn' ? 'মোট বকেয়া পাওনা হিসাব' : 'Total Outstanding Dues'}</span>
                {totalMembersDue > 0 ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                )}
              </div>
              <p className={`text-2xl font-extrabold font-mono ${totalMembersDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-300'}`}>
                ৳{totalMembersDue.toFixed(2)}
              </p>
              <p className={`text-xs font-medium mt-1 ${totalMembersDue > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-300'}`}>
                {totalMembersDue > 0
                  ? (language === 'bn' ? `${dueMembersCount} জন মেম্বারের বকেয়া পাওনা রয়েছে` : `${dueMembersCount} members with pending dues`)
                  : (language === 'bn' ? 'সকল মেম্বার একাউন্ট ক্লিয়ার (বকেয়া নেই)' : 'Zero outstanding dues • All accounts clear')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-emerald-600/30 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-2">
                <span>{language === 'bn' ? 'মোট সক্রিয় মেম্বার' : 'Active Team Members'}</span>
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">Verified Shopify Organization Staff</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-amber-500/30 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-2">
                <span>{language === 'bn' ? 'ডিপার্টমেন্টসমূহ' : 'Departments'}</span>
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-300">{uniqueDeptsCount || 1}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">Cross-functional Teams</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-teal-500/30 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-2">
                <span>{language === 'bn' ? 'অনলাইনে সক্রিয়' : 'Online Right Now'}</span>
                <CheckCircle2 className="w-4 h-4 text-teal-500 dark:text-teal-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-teal-600 dark:text-teal-300">{onlineCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">Real-time Active Presence</p>
            </div>
          </div>
        )}

        {/* Member Status Tabs (Pending vs Active Filter for Admins & Super Admin) */}
        {isAdminOrSuper && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-full sm:w-fit shadow-xs">
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                statusTab === 'all'
                  ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Members ({members.length})
            </button>
            <button
              onClick={() => setStatusTab('approved')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                statusTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300'
              }`}
            >
              Active / Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusTab('pending')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300'
              }`}
            >
              <span>Pending Approval ({pendingCount})</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
          <div className="relative w-full md:w-72 lg:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'মেম্বার নাম বা ইমেইল খুঁজুন...' : 'Search member name or email...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-x-auto pb-1">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${departmentFilter === dept
                  ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100/80 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800'
                  }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Member Grid Cards */}
        {loading ? (
          <LuxuryLoader message="Loading team members..." subMessage="Fetching dynamic balances & profiles" />
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            {language === 'bn'
              ? 'কোনো মেম্বার অ্যাকাউন্ট পাওয়া যায়নি। মেম্বাররা লগইন করলে বা উপরে "+ Add Member" বাটনে ক্লিক করলে দেখতে পাবেন।'
              : 'No registered members found. Members appear dynamically upon sign-in or via "+ Add Member" above.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredMembers.map(member => {
              const isMemberRootSuper = member.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={member.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=047857&color=fff`}
                          alt={member.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/30"
                        />
                        <div className="min-w-0">
                          <h3 className="font-serif font-bold text-slate-900 dark:text-white text-base leading-snug truncate">
                            {member.name}
                          </h3>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-mono font-semibold truncate">
                            {member.username || `@${member.email.split('@')[0]}`}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                              {member.department}
                            </span>
                            {member.status === 'pending' && (
                              <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdminOrSuper && member.status === 'pending' && (
                          <button
                            onClick={() => handleApproveMember(member)}
                            title="Approve Member"
                            className="p-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1 transition-all hover:scale-105"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'অনুমোদন' : 'Approve'}</span>
                          </button>
                        )}
                        {isSuper && (
                          <div>
                            {isMemberRootSuper ? (
                              <span title="Root Super Admin is protected" className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 inline-flex items-center">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeleteError('');
                                  setDeleteModalUser(member);
                                }}
                                title="Delete Member (Permanent DB removal)"
                                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-950 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/80 transition-all hover:scale-105"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isAdminOrSuper ? (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">{language === 'bn' ? 'ব্যালেন্স:' : 'Balance:'}</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">৳{(member.balance || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">{language === 'bn' ? 'মোট খরচ:' : 'Total Spent:'}</span>
                          <span className="font-mono font-medium text-amber-700 dark:text-amber-200">৳{(member.totalSpent || 0).toFixed(2)}</span>
                        </div>
                        {(Number(member.currentDue) || 0) > 0 && (
                          <div 
                            onClick={() => openBalanceModal(member, 'set', 'due')}
                            title="Click to manage or clear due"
                            className="flex justify-between items-center pt-1 border-t border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:bg-rose-500/10 rounded-lg p-1 transition-colors"
                          >
                            <span className="text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
                              <span>{language === 'bn' ? 'বকেয়া পাওনা:' : 'Current Due:'}</span>
                              <span className="text-[10px] underline">(Edit)</span>
                            </span>
                            <span className="font-mono font-bold text-rose-700 dark:text-rose-400">৳{(Number(member.currentDue) || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Role:</span>
                          <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {member.role === 'super_admin' ? 'Super Admin' : member.role === 'admin' ? 'Admin' : 'Team Member'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Status:</span>
                          <span className={`font-semibold flex items-center gap-1.5 ${member.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span>{member.isOnline ? 'Online Now' : 'Team Member'}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    {/* Balance Manage Buttons (Admin & Super Admin Only) */}
                    {isAdminOrSuper && (
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <button
                          onClick={() => openBalanceModal(member, 'add')}
                          className="py-2 px-1.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-700/60 font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 whitespace-nowrap shadow-xs transition-all hover:scale-[1.02]"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Add</span>
                        </button>
                        <button
                          onClick={() => openBalanceModal(member, 'deduct')}
                          className="py-2 px-1.5 rounded-xl bg-rose-50/90 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 border border-rose-500/20 dark:border-rose-800/60 font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 whitespace-nowrap shadow-xs transition-all hover:scale-[1.02]"
                        >
                          <MinusCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Deduct</span>
                        </button>
                        <button
                          onClick={() => openBalanceModal(member, 'set')}
                          className="py-2 px-1.5 rounded-xl bg-amber-50/90 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-slate-700 font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 whitespace-nowrap shadow-xs transition-all hover:scale-[1.02]"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Edit</span>
                        </button>
                      </div>
                    )}

                    {/* Member Actions */}
                    <div className={isAdminOrSuper ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'}>
                      {isAdminOrSuper && (
                        <button
                          onClick={() => setSelectedOrderMember(member.name)}
                          className="py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Utensils className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'bn' ? 'অর্ডার দিন' : 'Order Food'}</span>
                        </button>
                      )}
                      <Link
                        href={`/chat?memberId=${encodeURIComponent(member.id)}`}
                        className="py-2.5 px-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] sm:text-xs whitespace-nowrap border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span>{language === 'bn' ? 'মেসেজ ও কল' : 'Chat & Call'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Balance & Due Modal (Add, Deduct, Set, Clear Due) */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {manageMode === 'balance' 
                    ? (language === 'bn' ? 'ব্যালেন্স নিয়ন্ত্রণ (Manage Balance)' : 'Manage Balance')
                    : (language === 'bn' ? 'বকেয়া নিয়ন্ত্রণ (Manage Due)' : 'Manage Outstanding Due')}
                </h3>
              </div>
              <button
                onClick={() => setBalanceModalUser(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs: Balance vs Due */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setManageMode('balance')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  manageMode === 'balance' 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                💰 {language === 'bn' ? 'ক্যাটারিং ব্যালেন্স' : 'Wallet Balance'}
              </button>
              <button
                type="button"
                onClick={() => setManageMode('due')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  manageMode === 'due' 
                    ? 'bg-rose-600 text-white shadow-md font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🧾 {language === 'bn' ? 'বকেয়া পাওনা (Due)' : 'Current Due'}
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                গ্রাহক: <strong className="text-amber-700 dark:text-amber-300">{balanceModalUser.name}</strong> ({balanceModalUser.email})
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 dark:text-slate-400">
                  বর্তমান ব্যালেন্স: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">৳{(balanceModalUser.balance || 0).toFixed(2)}</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  বকেয়া: <span className="font-mono font-bold text-rose-700 dark:text-rose-400">৳{(Number(balanceModalUser.currentDue) || 0).toFixed(2)}</span>
                </span>
              </div>
            </div>

            {manageMode === 'balance' ? (
              /* BALANCE MODE */
              <>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBalanceAction('add')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${balanceAction === 'add'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    + যোগ (Add)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBalanceAction('deduct')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${balanceAction === 'deduct'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${balanceAction === 'set'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    ✏️ এডিট (Set)
                  </button>
                </div>

                <form onSubmit={handleBalanceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase mb-1">
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
                            className={`py-1 text-xs font-bold rounded-lg ${balanceAmount === amt ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
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
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-emerald-700 dark:text-emerald-400 font-bold text-base focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">নতুন ব্যালেন্স দাঁড়াবে:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm">
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
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg ${balanceAction === 'deduct'
                        ? 'bg-rose-600 text-white hover:bg-rose-500'
                        : 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white'
                        }`}
                    >
                      {balanceAction === 'add' ? 'ব্যালেন্স যোগ করুন' : (balanceAction === 'deduct' ? 'ব্যালেন্স কর্তন করুন' : 'ব্যালেন্স পরিবর্তন করুন')}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* DUE MODE */
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDueAction('set');
                      setDueAmount(Number(balanceModalUser.currentDue) || 0);
                    }}
                    className={`py-2 text-[11px] font-bold rounded-xl transition-all ${dueAction === 'set'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    ✏️ সেট (Set)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDueAction('add')}
                    className={`py-2 text-[11px] font-bold rounded-xl transition-all ${dueAction === 'add'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    + যোগ (Add)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDueAction('deduct')}
                    className={`py-2 text-[11px] font-bold rounded-xl transition-all ${dueAction === 'deduct'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    - পরিশোধ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDueAction('clear');
                      setDueAmount(0);
                    }}
                    className={`py-2 text-[11px] font-bold rounded-xl transition-all ${dueAction === 'clear'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    ✅ ক্লিয়ার
                  </button>
                </div>

                <form onSubmit={handleBalanceSubmit} className="space-y-4">
                  {dueAction !== 'clear' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase mb-1">
                        {dueAction === 'set'
                          ? 'নতুন বকেয়া কত নির্ধারণ করতে চান? (BDT ৳)'
                          : (dueAction === 'add' ? 'কত টাকা বকেয়া যোগ করতে চান? (BDT ৳)' : 'কত টাকা বকেয়া পরিশোধ/কমাতে চান? (BDT ৳)')}
                      </label>

                      {dueAction !== 'set' && (
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                          {[50, 100, 200, 500].map(amt => (
                            <button
                              type="button"
                              key={amt}
                              onClick={() => setDueAmount(amt)}
                              className={`py-1 text-xs font-bold rounded-lg ${dueAmount === amt ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
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
                        value={dueAmount}
                        onChange={e => setDueAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-rose-600 dark:text-rose-400 font-bold text-base focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>বকেয়া সম্পূর্ণ পরিশোধ / ক্লিয়ার (৳0.00)</span>
                      </p>
                      <p className="mt-1 text-[11px] text-teal-600/90 dark:text-teal-400/90">
                        এই মেম্বারের বকেয়া পাওনা সম্পূর্ণ মুছে দিয়ে ৳০.০০ করা হবে।
                      </p>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">নতুন বকেয়া দাঁড়াবে:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      ৳{dueAction === 'clear' 
                        ? '0.00' 
                        : (dueAction === 'set' 
                          ? Number(dueAmount).toFixed(2) 
                          : (dueAction === 'add' 
                            ? ((Number(balanceModalUser.currentDue) || 0) + Number(dueAmount)).toFixed(2)
                            : Math.max(0, (Number(balanceModalUser.currentDue) || 0) - Number(dueAmount)).toFixed(2)))}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBalanceModalUser(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl font-bold text-xs shadow-lg bg-rose-600 hover:bg-rose-500 text-white transition-all hover:scale-105"
                    >
                      {dueAction === 'clear' ? 'বকেয়া সম্পূর্ণ ক্লিয়ার করুন' : 'বকেয়া আপডেট করুন'}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="font-serif font-bold text-slate-900 dark:text-white text-base">
                {language === 'bn' ? 'নতুন মেম্বার যুক্ত করুন' : 'Register New Team Member'}
              </h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase mb-1">
                  মেম্বারের পূর্ণ নাম *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase mb-1">
                  ইমেইল অ্যাড্রেস *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="tanvir@shopify.com"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase mb-1">
                    ডিপার্টমেন্ট
                  </label>
                  <select
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Development">Development</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Design & UX">Design & UX</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Support">Support</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase mb-1">
                    প্রাথমিক ব্যালেন্স (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newBalance}
                    onChange={e => setNewBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold text-xs shadow-md"
                >
                  মেম্বার সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      {selectedOrderMember && (
        <QuickOrderModal
          isOpen={true}
          prefillCustomer={selectedOrderMember}
          onClose={() => setSelectedOrderMember(null)}
          onSubmit={async (data) => {
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...data,
                customerName: selectedOrderMember,
              }),
            });
            fetchMembers();
          }}
        />
      )}

      {/* Permanent Member Deletion Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-rose-600/50 rounded-3xl p-6 shadow-2xl space-y-4">

            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200/80 dark:border-rose-700/60 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-serif font-bold text-slate-900 dark:text-white text-lg">
                Permanently Delete Member?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                This action is irreversible. The member profile and all associated catering database records will be permanently purged.
              </p>
            </div>

            {/* Target Member Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={deleteModalUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(deleteModalUser.name)}&background=047857&color=fff`}
                  alt={deleteModalUser.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-rose-500/30"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{deleteModalUser.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{deleteModalUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-900 text-xs">
                <div>
                  <span className="text-slate-500">Department:</span>
                  <p className="text-slate-800 dark:text-slate-300 font-medium">{deleteModalUser.department}</p>
                </div>
                <div>
                  <span className="text-slate-500">Remaining Balance:</span>
                  <p className={`font-mono font-bold ${deleteModalUser.balance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    ৳{deleteModalUser.balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {deleteModalUser.balance > 0 && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-600/30 text-[11px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Warning: This user still has an active balance of ৳{deleteModalUser.balance.toFixed(2)}.</span>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300/80 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteMember}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <LuxurySpinnerIcon size="xs" />
                    <span>Purging from Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <AuthGuard>
      <MembersPageContent />
    </AuthGuard>
  );
}
