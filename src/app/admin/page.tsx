'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import OrderControlCard from '@/components/OrderControlCard';
import DateFilterPills from '@/components/DateFilterPills';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, MenuItemData, UserRecord, PasswordResetRequest } from '@/lib/types';
import { getClientCache, setClientCache, clearClientCache } from '@/lib/clientCache';
import { filterOrdersByDate, calculateStatsFromOrders, DateFilterType } from '@/lib/dateFilterUtils';
import Link from 'next/link';
import {
  ShieldCheck,
  ChefHat,
  Utensils,
  Plus,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Edit3,
  Trash2,
  Wallet,
  Users,
  Coins,
  Search,
  KeyRound,
  Copy,
  Check,
  Clock
} from 'lucide-react';

function AdminPageContent() {
  const { user } = useAuth();
  const { language } = useLanguage();

  // Instant 0ms cache initialize
  const [orders, setOrders] = useState<OrderData[]>(() => {
    return getClientCache<OrderData[]>('orders_list') || [];
  });
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(() => {
    return getClientCache<MenuItemData[]>('menu_items') || [];
  });
  const [members, setMembers] = useState<UserRecord[]>(() => {
    return getClientCache<UserRecord[]>('members_list') || [];
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [stats, setStats] = useState({
    ordersCount: 0,
    completedOrdersCount: 0,
    totalOrders: 0,
    totalBill: 0,
    totalPaid: 0,
    totalRefundChange: 0,
    totalDue: 0,
    collectionRate: "0.0%",
    rawCollectionRate: 0
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getClientCache<OrderData[]>('orders_list');
    return !cached || cached.length === 0;
  });
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'balance' | 'resets' | 'timing'>('orders');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');

  // Filter orders by date range
  const filteredByDateOrders = useMemo(() => {
    return filterOrdersByDate(orders, dateFilter);
  }, [orders, dateFilter]);

  // Dynamic calculated stats for the selected date range
  const dynamicStats = useMemo(() => {
    const s = calculateStatsFromOrders(filteredByDateOrders);
    const totalMemberBalance = members.reduce((sum, m) => sum + (Number(m.balance) || 0), 0);
    return {
      ...s,
      totalMemberBalance,
    };
  }, [filteredByDateOrders, members]);

  // Counts for date filter pills
  const dateCounts = useMemo(() => {
    return {
      today: filterOrdersByDate(orders, 'today').length,
      yesterday: filterOrdersByDate(orders, 'yesterday').length,
      '7days': filterOrdersByDate(orders, '7days').length,
      '30days': filterOrdersByDate(orders, '30days').length,
      '1year': filterOrdersByDate(orders, '1year').length,
      lifetime: orders.length,
    };
  }, [orders]);

  // Password reset requests state
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Menu item modal
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishNameBn, setDishNameBn] = useState('');
  const [dishPrice, setDishPrice] = useState<number>(20);
  const [dishCategory, setDishCategory] = useState<MenuItemData['category']>('Refreshments');
  const [dishImageUrl, setDishImageUrl] = useState('');

  // Balance modal for Admin (Add, Deduct, Set)
  const [balanceModalUser, setBalanceModalUser] = useState<UserRecord | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [balanceAmount, setBalanceAmount] = useState<number>(500);

  const fetchAdminData = async () => {
    try {
      const [ordRes, statRes, menuRes, userRes, resetRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/stats'),
        fetch('/api/menu'),
        fetch('/api/users'),
        fetch('/api/auth/reset-password')
      ]);

      if (ordRes.ok) {
        const o = await ordRes.json();
        if (o.success && o.data) setOrders(o.data);
        if (o.success && o.data) {
          setOrders(o.data);
          setClientCache('orders_list', o.data);
        }
      }
      if (statRes.ok) {
        const s = await statRes.json();
        if (s.success && s.data) setStats(s.data);
      }
      if (menuRes.ok) {
        const m = await menuRes.json();
        if (m.success && m.data) setMenuItems(m.data);
        if (m.success && m.data) {
          setMenuItems(m.data);
          setClientCache('menu_items', m.data);
        }
      }
      if (userRes.ok) {
        const u = await userRes.json();
        if (u.success && u.data) setMembers(u.data);
        if (u.success && u.data) {
          setMembers(u.data);
          setClientCache('members_list', u.data);
        }
      }
      if (resetRes.ok) {
        const r = await resetRes.json();
        if (r.success && r.data) setResetRequests(r.data);
      }
    } catch (e) {
      console.warn('Using live state');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCancelReset = async (requestId: string) => {
    if (!window.confirm('Cancel this password reset request?')) return;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', requestId }),
      });
      if (res.ok) {
        setResetRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: OrderData['status']) => {
    setOrders(prev => prev.map(o => (o._id === id || o.orderNumber === id) ? { ...o, status: newStatus } : o));
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(language === 'bn' ? 'অর্ডারটি ডিলিট করতে চান?' : 'Delete order?')) return;
    setOrders(prev => prev.filter(o => o._id !== id && o.orderNumber !== id));
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      clearClientCache();
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim() || dishPrice <= 0) return;

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dishName.trim(),
          nameBn: dishNameBn.trim() || dishName.trim(),
          price: Number(dishPrice),
          category: dishCategory,
          imageUrl: dishImageUrl.trim() || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
          isAvailable: true,
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) setMenuItems(prev => [json.data, ...prev]);
        setIsDishModalOpen(false);
        setDishName('');
        setDishNameBn('');
        setDishPrice(20);
        setDishImageUrl('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDish = async (id?: string) => {
    if (!id || !confirm('Are you sure you want to delete this dish?')) return;
    try {
      await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
      setMenuItems(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Balance actions
  const openBalanceModal = (u: UserRecord, action: 'add' | 'deduct' | 'set' = 'add') => {
    setBalanceModalUser(u);
    setBalanceAction(action);
    setBalanceAmount(action === 'set' ? u.balance : (action === 'deduct' ? Math.min(100, u.balance) : 500));
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
          setMembers(prev => prev.map(m => m.id === balanceModalUser.id ? json.data : m));
        } else {
          fetchAdminData();
        }
        setBalanceModalUser(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMembers = members.filter(m =>
    (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.department || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-[1920px] w-full mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-900/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 p-[2px] shadow-lg shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold font-serif text-white">
                    {language === 'bn' ? 'অ্যাডমিন কিচেন ও ক্যাটারিং ড্যাশবোর্ড' : 'Admin Catering Operations Portal'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    {user?.role === 'super_admin' ? 'Super Admin Mode' : 'Admin Manager'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' ? 'দৈনিক অর্ডার প্রস্তুত, মেনু কন্ট্রোল ও মেম্বারদের ব্যালেন্স অ্যাড/রিমুভ/এডিট' : 'Kitchen workflow, menu pricing control, and member balance management'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {user?.role === 'super_admin' && (
                <Link
                  href="/super-admin"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-amber-400 border border-amber-500/30"
                >
                  👑 Super Admin
                </Link>
              )}
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md"
              >
                + {language === 'bn' ? 'অর্ডার এন্ট্রি' : 'New Order'}
              </button>
            </div>
          </div>

          {/* 3 Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900 rounded-2xl w-fit border border-slate-800">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-emerald-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
              📋 {language === 'bn' ? 'অর্ডার ও পেমেন্ট ট্র্যাকার' : 'Orders & Ledger'}
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'menu' ? 'bg-emerald-700 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
              🍲 {language === 'bn' ? 'মেনু ক্যাটালগ কন্ট্রোল' : 'Menu Management'}
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'balance' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
              💳 {language === 'bn' ? 'মেম্বার ব্যালেন্স কন্ট্রোল' : 'Member Balances'}
            </button>
            <button
              onClick={() => setActiveTab('resets')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'resets' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Reset Codes (OTP)</span>
              {resetRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                  {resetRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('timing')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'timing' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'অর্ডার কাট-অফ ও টাইমিং' : 'Order Cutoff & Timing'}</span>
            </button>
          </div>

          {activeTab === 'orders' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <DateFilterPills
                  selected={dateFilter}
                  onChange={setDateFilter}
                  counts={dateCounts}
                />
              </div>

              <MetricsOverview stats={dynamicStats} isLoading={loading} />

              <LiveTrackerTable
                orders={filteredByDateOrders}
                onOpenNewOrder={() => setIsOrderModalOpen(true)}
                onSelectInvoice={(order) => setSelectedInvoice(order)}
                onUpdateStatus={handleUpdateStatus}
                onDeleteOrder={handleDeleteOrder}
                isLoading={loading}
              />
            </div>
          ) : activeTab === 'timing' ? (
            <div className="space-y-6">
              <OrderControlCard />
            </div>
          ) : activeTab === 'menu' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {language === 'bn' ? 'ক্যাটারিং মেনুর খাবার যুক্ত ও ডিলিট করুন' : 'Add or remove dishes from the digital menu'}
                </p>
                <button
                  onClick={() => setIsDishModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>{language === 'bn' ? 'নতুন খাবার' : 'Add Dish'}</span>
                </button>
              </div>

              {loading ? (
                <LuxuryLoader message="Loading catering dishes..." subMessage="Fetching active menu" />
              ) : menuItems.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-slate-900/50 border border-slate-800 text-slate-400">
                  <Utensils className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>{language === 'bn' ? 'মেনুতে এখনও কোনো খাবার যুক্ত করা হয়নি।' : 'No dishes added to the menu yet.'}</p>
                  <button
                    onClick={() => setIsDishModalOpen(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs"
                  >
                    + {language === 'bn' ? 'প্রথম খাবার যুক্ত করুন' : 'Add First Dish'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map(item => (
                    <div
                      key={item._id || item.name}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover ring-1 ring-emerald-500/30"
                        />
                        <div>
                          <h4 className="font-bold text-white text-xs">{item.name}</h4>
                          <p className="text-[11px] text-slate-400">{item.nameBn}</p>
                          <span className="font-mono font-bold text-amber-300 text-xs">৳{item.price}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteDish(item._id)}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800 text-xs"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Balance Management Tab for Admin */
            <div className="rounded-3xl bg-slate-900/90 border border-amber-500/40 p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span>Member Catering Balances (Add, Deduct, Edit)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'অ্যাডমিন হিসেবে যেকোনো মেম্বারের অ্যাকাউন্টে ব্যালেন্স যোগ করতে, কাটতে বা সরাসরি এডিট করতে পারবেন'
                      : 'As an admin, you can add funds, deduct spent balances, or set exact amounts for any member.'}
                  </p>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search member..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              {loading ? (
                <LuxuryLoader message="Loading member balances..." subMessage="Fetching dynamic ledger" />
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  {language === 'bn'
                    ? 'কোনো মেম্বার অ্যাকাউন্ট পাওয়া যায়নি। মেম্বাররা লগইন করলে তাদের লাইভ ব্যালেন্স এখানে দেখা যাবে।'
                    : 'No real members found yet. Real users appear dynamically upon Google/Email sign-in.'}
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4 text-right">Current Balance (৳)</th>
                        <th className="py-3 px-4 text-center">Role</th>
                        <th className="py-3 px-4 text-right">Manage Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <img
                              src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                              alt={m.name}
                              className="w-7 h-7 rounded-lg object-cover"
                            />
                            <div>
                              <span>{m.name}</span>
                              <p className="text-[10px] text-slate-400 font-mono font-normal">{m.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{m.department}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                            ৳{m.balance.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openBalanceModal(m, 'add')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-semibold"
                              >
                                + Add
                              </button>
                              <button
                                onClick={() => openBalanceModal(m, 'deduct')}
                                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold"
                              >
                                - Deduct
                              </button>
                              <button
                                onClick={() => openBalanceModal(m, 'set')}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Password Reset Requests & OTP Codes */}
          {activeTab === 'resets' && (
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-white text-base">
                      Password Reset Requests & OTP Codes
                    </h3>
                    <p className="text-xs text-slate-400">
                      When members request a password reset, their 6-digit verification code appears here.
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchAdminData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {resetRequests.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-300 text-sm">No Pending Password Reset Requests</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When a user requests a reset from the login page, their 6-digit OTP code will arrive here instantly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resetRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Active Request
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-sm truncate">{req.userName || 'Member'}</h4>
                        <p className="text-xs text-slate-400 font-mono truncate">{req.email}</p>
                      </div>

                      {/* Golden Highlighted 6-digit OTP code */}
                      <div className="bg-slate-900 border border-amber-500/60 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                            Verification OTP Code
                          </p>
                          <p className="text-xl font-mono font-extrabold text-amber-300 tracking-widest">
                            {req.code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopyCode(req.id, req.code)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
                        >
                          {copiedId === req.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Valid for 30m</span>
                        </span>
                        <button
                          onClick={() => handleCancelReset(req.id)}
                          className="text-rose-400 hover:text-rose-300 font-semibold hover:underline"
                        >
                          Cancel Code
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Admin Add Dish Modal */}
      {isDishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-serif font-bold text-white text-base">
                নতুন খাবার যুক্ত করুন (Add Dish)
              </h3>
              <button onClick={() => setIsDishModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDish} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Dish Name (English) *</label>
                <input
                  type="text"
                  required
                  value={dishName}
                  onChange={e => setDishName(e.target.value)}
                  placeholder="e.g. Royal Singara"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">নাম (বাংলা)</label>
                <input
                  type="text"
                  value={dishNameBn}
                  onChange={e => setDishNameBn(e.target.value)}
                  placeholder="যেমনঃ ক্রিস্পি সিঙ্গারা"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">মূল্য (Price ৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={dishPrice}
                    onChange={e => setDishPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={dishCategory}
                    onChange={e => setDishCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {dishCategory && !['Refreshments', 'Lunch', 'Beverages', 'Executive Catering', 'Dessert'].includes(dishCategory) && (
                      <option value={dishCategory}>{dishCategory}</option>
                    )}
                    <option value="Refreshments">Refreshments</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Executive Catering">Executive Catering</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Image URL</label>
                <input
                  type="text"
                  value={dishImageUrl}
                  onChange={e => setDishImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDishModalOpen(false)}
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

      {/* Admin Balance Modal (Add, Deduct, Set) */}
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

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setBalanceAction('add')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${balanceAction === 'add'
                  ? 'bg-emerald-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                + যোগ (Add)
              </button>

              <button
                type="button"
                onClick={() => setBalanceAction('deduct')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${balanceAction === 'deduct'
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
                className={`py-2 text-xs font-bold rounded-xl transition-all ${balanceAction === 'set'
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
                        className={`py-1 text-xs font-bold rounded-lg ${balanceAmount === amt ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
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
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg ${balanceAction === 'deduct'
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

      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={async (data) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          fetchAdminData();
        }}
      />

      <InvoiceModal
        order={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard allowedRoles={['super_admin', 'admin']}>
      <AdminPageContent />
    </AuthGuard>
  );
}
