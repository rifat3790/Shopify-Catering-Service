'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import InvoiceModal from '@/components/InvoiceModal';
import QuickOrderModal from '@/components/QuickOrderModal';
import ProfileModal from '@/components/ProfileModal';
import DateFilterPills from '@/components/DateFilterPills';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OrderData, UserRecord } from '@/lib/types';
import { getClientCache, setClientCache } from '@/lib/clientCache';
import { filterOrdersByDate, DateFilterType } from '@/lib/dateFilterUtils';
import Link from 'next/link';
import { 
  Wallet, 
  Download, 
  ShoppingBag, 
  CheckCircle2, 
  Receipt, 
  UtensilsCrossed, 
  Plus, 
  RefreshCw,
  MessageSquare,
  Edit3,
  X
} from 'lucide-react';

function UserDashboardContent() {
  const { user, refreshUser, updateLocalUserProfile } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  // Instant 0ms cache initialize
  const [orders, setOrders] = useState<OrderData[]>(() => {
    return getClientCache<OrderData[]>('orders_list') || [];
  });
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getClientCache<OrderData[]>('orders_list');
    return !cached || cached.length === 0;
  });

  // Admin view switcher (only for super_admin and admin)
  const isElevated = user?.role === 'super_admin' || user?.role === 'admin';
  const [elevatedMemberList, setElevatedMemberList] = useState<UserRecord[]>(() => {
    return getClientCache<UserRecord[]>('members_list') || [];
  });
  const [inspectedUserName, setInspectedUserName] = useState<string>('');

  // Balance Quick Edit / Recharge Modal
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<number>(500);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  const loadUserData = async (silent = false) => {
    if (!silent && (!orders || orders.length === 0)) {
      setLoading(true);
    }
    try {
      const [ordRes, uRes] = await Promise.all([
        fetch('/api/orders').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/users').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (ordRes && ordRes.success && Array.isArray(ordRes.data)) {
        setOrders(ordRes.data);
        setClientCache('orders_list', ordRes.data);
      }

      if (uRes && uRes.success && Array.isArray(uRes.data)) {
        setElevatedMemberList(uRes.data);
        setClientCache('members_list', uRes.data);
        const me = uRes.data.find((u: UserRecord) => 
          (user?.email && u.email.toLowerCase() === user.email.toLowerCase()) || 
          (user?.uid && u.id === user.uid)
        );
        if (me) {
          updateLocalUserProfile({ 
            balance: me.balance !== undefined ? me.balance : 0, 
            totalSpent: me.totalSpent !== undefined ? me.totalSpent : 0,
            role: me.role,
            avatar: me.avatar,
            name: me.name,
            displayName: me.name,
            photoURL: me.avatar,
            username: me.username
          });
        }
      }
    } catch (e) {
      console.warn('Error loading orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData(true);
  }, [user?.uid, user?.email]);

  // Target User determination: either inspected member or current logged in user
  const inspectedMember = useMemo(() => {
    if (!inspectedUserName) return null;
    return elevatedMemberList.find(m => m.name === inspectedUserName || m.email === inspectedUserName) || null;
  }, [inspectedUserName, elevatedMemberList]);

  const activeUserRecord = useMemo(() => {
    if (inspectedMember) return inspectedMember;
    if (!user) return null;
    return elevatedMemberList.find(m => 
      (user.email && m.email?.toLowerCase() === user.email.toLowerCase()) || 
      (user.uid && m.id === user.uid)
    ) || null;
  }, [inspectedMember, user, elevatedMemberList]);

  // Strict email & ID for the current viewing context (100% user-isolated)
  const effectiveEmail = useMemo(() => {
    return (inspectedMember?.email || activeUserRecord?.email || user?.email || '').toLowerCase().trim();
  }, [inspectedMember, activeUserRecord, user]);

  const effectiveUid = useMemo(() => {
    return inspectedMember?.id || activeUserRecord?.id || user?.uid || '';
  }, [inspectedMember, activeUserRecord, user]);

  const effectiveName = useMemo(() => {
    return (inspectedMember?.name || activeUserRecord?.name || user?.displayName || user?.name || user?.email?.split('@')[0] || 'User').trim();
  }, [inspectedMember, activeUserRecord, user]);

  // STRICT PERSONAL ORDERS FILTER (NO loose substring matching - complete user isolation!)
  const allPersonalOrders = useMemo(() => {
    return orders.filter(o => {
      const oMail = (o.customerEmail || '').toLowerCase().trim();
      const oUid = o.userId || '';
      const oName = (o.customerName || '').toLowerCase().trim();

      // Priority 1: Exact customer email match
      if (oMail && effectiveEmail) {
        return oMail === effectiveEmail;
      }
      // Priority 2: Exact user ID match
      if (oUid && effectiveUid) {
        return oUid === effectiveUid;
      }
      // Priority 3: Exact customer name match (only if email & uid are not set)
      if (oName && effectiveName) {
        return oName === effectiveName.toLowerCase();
      }
      return false;
    });
  }, [orders, effectiveEmail, effectiveUid, effectiveName]);

  // Filter personal orders by selected date period
  const myOrders = useMemo(() => {
    return filterOrdersByDate(allPersonalOrders, dateFilter);
  }, [allPersonalOrders, dateFilter]);

  // Date counts for personal orders
  const dateCounts = useMemo(() => {
    return {
      today: filterOrdersByDate(allPersonalOrders, 'today').length,
      yesterday: filterOrdersByDate(allPersonalOrders, 'yesterday').length,
      '7days': filterOrdersByDate(allPersonalOrders, '7days').length,
      '30days': filterOrdersByDate(allPersonalOrders, '30days').length,
      '1year': filterOrdersByDate(allPersonalOrders, '1year').length,
      lifetime: allPersonalOrders.length,
    };
  }, [allPersonalOrders]);

  // Calculations strictly for this user (100% dynamic from real orders)
  const lifetimeSpent = useMemo(() => {
    return allPersonalOrders.reduce((acc, curr) => acc + (Number(curr.totalBill) || 0), 0);
  }, [allPersonalOrders]);

  const periodSpent = useMemo(() => {
    return myOrders.reduce((acc, curr) => acc + (Number(curr.totalBill) || 0), 0);
  }, [myOrders]);

  const lifetimeDue = useMemo(() => {
    return allPersonalOrders
      .filter(o => o.status === 'Due' || o.changeDue < 0)
      .reduce((acc, curr) => acc + Math.max(0, (Number(curr.totalBill) || 0) - (Number(curr.paidAmount) || 0)), 0);
  }, [allPersonalOrders]);

  const periodDue = useMemo(() => {
    return myOrders
      .filter(o => o.status === 'Due' || o.changeDue < 0)
      .reduce((acc, curr) => acc + Math.max(0, (Number(curr.totalBill) || 0) - (Number(curr.paidAmount) || 0)), 0);
  }, [myOrders]);

  const displayBalance = activeUserRecord ? (Number(activeUserRecord.balance) || 0) : (Number(user?.balance) || 0);

  // If allPersonalOrders is 0: Spent and Due are strictly 0!
  // If dateFilter === 'lifetime', show lifetime totals; otherwise show selected period totals!
  const displaySpent = allPersonalOrders.length === 0
    ? 0
    : (dateFilter === 'lifetime' ? lifetimeSpent : periodSpent);

  const displayDue = allPersonalOrders.length === 0
    ? 0
    : (dateFilter === 'lifetime' ? lifetimeDue : periodDue);

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (balanceAmount < 0) return;

    const targetUserId = activeUserRecord?.id || user?.uid || '';
    if (!targetUserId) return;

    setIsUpdatingBalance(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          balanceAmount: Number(balanceAmount),
          action: balanceAction
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success(
          language === 'bn' 
            ? `ব্যালেন্স সফলভাবে আপডেট হয়েছে! বর্তমান ব্যালেন্স: ৳${Number(json.data.balance).toFixed(2)}`
            : `Balance updated successfully! Balance: ৳${Number(json.data.balance).toFixed(2)}`,
          'Balance Updated'
        );
        setElevatedMemberList(prev => prev.map(m => m.id === targetUserId ? json.data : m));
        if (targetUserId === user?.uid || json.data.email?.toLowerCase() === user?.email?.toLowerCase()) {
          updateLocalUserProfile({ balance: json.data.balance });
        }
        setIsBalanceModalOpen(false);
      } else {
        toast.error(json.error || 'Failed to update balance', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating balance', 'Failed');
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-[1920px] w-full mx-auto">
          
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-emerald-900/40">
            <div className="flex items-center gap-3">
              <img
                src={activeUserRecord?.avatar || user?.photoURL || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveName || 'User')}&background=047857&color=fff`}
                alt={effectiveName || 'User'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveName || 'User')}&background=047857&color=fff`;
                }}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/50 shadow-lg shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                    {effectiveName || 'User'}&apos;s Catering Hub
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    {user?.department || 'Shopify Member'}
                  </span>
                </div>
                <p className="text-xs font-mono text-amber-300 font-semibold mt-0.5">
                  {user?.username || `@${user?.email?.split('@')[0] || 'user'}`}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' 
                    ? 'আপনার ব্যক্তিগত খাবার হিসাব, ওয়ালেট ব্যালেন্স ও রসিদ ডাউনলোড পোর্টাল'
                    : 'Personal catering account, dynamic wallet balance & instant invoice image download'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              {/* Profile Edit Button */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
                title={language === 'bn' ? 'প্রোফাইল পরিবর্তন করুন' : 'Edit Profile'}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'প্রোফাইল এডিট' : 'Edit Profile'}</span>
              </button>

              {/* Elevated Inspector for Super Admin */}
              {isElevated && elevatedMemberList.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                  <span className="text-[10px] text-slate-400 pl-2">Inspect Member:</span>
                  <select
                    value={inspectedUserName}
                    onChange={(e) => setInspectedUserName(e.target.value)}
                    className="bg-slate-950 text-emerald-300 font-semibold text-xs rounded-lg px-2 py-1 outline-none border border-slate-800 cursor-pointer"
                  >
                    <option value="">My Own Account ({user?.displayName || user?.name || 'Self'})</option>
                    {elevatedMemberList.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.department}) - ৳{m.balance}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link
                href="/chat"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Team & Voice Chat</span>
              </Link>

              <button
                onClick={async () => {
                  await refreshUser();
                  await loadUserData();
                  toast.info(language === 'bn' ? 'ডাটাবেস থেকে রিফ্রেশ করা হয়েছে!' : 'Refreshed from database!', 'Refreshed');
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md"
              >
                + {language === 'bn' ? 'নতুন খাবার অর্ডার' : 'Order Food'}
              </button>
            </div>
          </div>

          {/* User Balance Master Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Main Dynamic Balance */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/40 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  {language === 'bn' ? 'বর্তমান ক্যাটারিং ব্যালেন্স (Wallet)' : 'Current Catering Balance'}
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
                  ৳{displayBalance.toFixed(2)}
                </h2>

                {/* Instant Balance Recharge / Edit for Admin/Super Admin */}
                {isElevated && (
                  <button
                    onClick={() => setIsBalanceModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold border border-amber-500/40 transition-all flex items-center gap-1 shadow-sm hover:scale-105"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ব্যালেন্স আপডেট' : 'Top-up / Edit'}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-2 flex items-center gap-1">
                <span>● {language === 'bn' ? 'যেকোনো খাবার অর্ডারের জন্য প্রস্তুত' : 'Available for immediate food ordering'}</span>
              </p>
            </div>

            {/* Total Spent */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'bn' ? 'মোট খাবার গ্রহণ (Total Spent)' : 'Total Catering Spent'}
                </span>
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-mono text-amber-300">
                ৳{displaySpent.toFixed(2)}
              </h2>
              <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
                <p className="text-[11px] text-slate-400">
                  {dateFilter === 'lifetime'
                    ? `${allPersonalOrders.length} ${language === 'bn' ? 'টি সফল অর্ডার সম্পন্ন' : 'Orders completed'}`
                    : `${myOrders.length} ${language === 'bn' ? 'টি সফল অর্ডার সম্পন্ন' : 'Orders completed'}`
                  }
                </p>
                {dateFilter !== 'lifetime' && allPersonalOrders.length > 0 && (
                  <span className="text-[10px] text-amber-400/90 font-mono font-semibold">
                    {language === 'bn' ? 'লাইফটাইম' : 'Lifetime'}: ৳{lifetimeSpent.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Unpaid / Due */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'bn' ? 'বকেয়া হিসাব (Current Due)' : 'Current Due / Credit'}
                </span>
                <div className={`p-2 rounded-xl border ${displayDue > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-teal-500/20 text-teal-300 border-teal-500/30'}`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-bold font-mono ${displayDue > 0 ? 'text-rose-400' : 'text-teal-300'}`}>
                ৳{displayDue.toFixed(2)}
              </h2>
              <p className={`text-[11px] mt-2 ${displayDue > 0 ? 'text-rose-400' : 'text-teal-400'}`}>
                {displayDue > 0 ? `৳${displayDue.toFixed(2)} বকেয়া` : (language === 'bn' ? 'কোনো বকেয়া নেই (Clear)' : 'Zero outstanding dues')}
              </p>
            </div>

          </div>

          {/* My Orders & Download Receipt Image Section */}
          <div className="rounded-3xl bg-slate-900/90 border border-emerald-900/60 shadow-2xl overflow-hidden backdrop-blur-xl">
            
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 border-b border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-serif text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <span>{language === 'bn' ? 'আমার খাবারের অর্ডার ও রসিদ ডাউনলোড' : 'My Orders & Invoice Image Downloads'}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {language === 'bn' 
                    ? 'প্রতিটি অর্ডারের রসিদ হাই-রেজোলিউশন ইমেজ (PNG) হিসেবে সরাসরি ডাউনলোড করুন' 
                    : 'Download any order receipt as a high-resolution PNG image'}
                </p>
              </div>

              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md self-start sm:self-auto"
              >
                + {language === 'bn' ? 'নতুন খাবার অর্ডার' : 'Order Food Now'}
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Date Filter Pills for Personal Orders (Defaults to Today) */}
              <DateFilterPills
                selected={dateFilter}
                onChange={setDateFilter}
                counts={dateCounts}
              />

              {loading ? (
                <LuxuryLoader message="Loading your personal orders..." subMessage="Fetching dynamic ledger" />
              ) : myOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>{language === 'bn' ? 'নির্ধারিত সময়সীমায় আপনার কোনো অর্ডার পাওয়া যায়নি।' : 'No orders found for this selected period.'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'bn' ? 'পূর্বের সকল অর্ডার দেখতে উপরে "সর্বমোট (Lifetime)" ফিল্টার নির্বাচন করুন।' : 'Select "Lifetime" filter above to see all historical orders.'}
                  </p>
                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
                  >
                    + {language === 'bn' ? 'খাবার অর্ডার করুন' : 'Order Food Now'}
                  </button>
                </div>
              ) : (
                myOrders.map(order => (
                  <div
                    key={order._id || order.orderNumber}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-300">
                          {order.orderNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white">
                        {order.itemsText || (order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Catering Order')}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-slate-300">{order.paymentMethod}</span>
                        {order.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-400">&quot;{order.notes}&quot;</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Bill</span>
                        <span className="font-mono font-bold text-base text-amber-300">
                          ৳{Number(order.totalBill).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedInvoice(order)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-950 text-amber-300 hover:text-amber-200 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'রসিদ ইমেজ' : 'Receipt Image'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </main>
      </div>

      {/* Invoice Modal for PNG Receipt Image Download */}
      {selectedInvoice && (
        <InvoiceModal
          order={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={async (data) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              customerName: data.customerName || user?.displayName || user?.name || 'Member',
              customerEmail: user?.email || '',
              userId: user?.uid || '',
              customerAvatar: data.customerAvatar || user?.photoURL || '',
            }),
          });
          await refreshUser();
          await loadUserData();
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaved={async () => {
          await refreshUser();
          await loadUserData();
        }}
      />

      {/* Instant Balance Top-up / Edit Modal */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <span>{language === 'bn' ? 'ব্যালেন্স আপডেট ও রিচার্জ' : 'Update & Top-up Balance'}</span>
              </h3>
              <button
                onClick={() => setIsBalanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBalanceSubmit} className="mt-4 space-y-4">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                {(['add', 'set', 'deduct'] as const).map(act => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setBalanceAction(act)}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      balanceAction === act 
                        ? 'bg-amber-400 text-slate-950 shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {act === 'add' ? '+ যোগ (Add)' : (act === 'set' ? '= সেট (Set)' : '- মাইনাস (Deduct)')}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {language === 'bn' ? 'টাকার পরিমাণ (Amount)' : 'Amount (BDT ৳)'}
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[100, 200, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBalanceAmount(amt)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                        balanceAmount === amt 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-400 font-bold text-lg focus:outline-none focus:border-amber-400"
                  placeholder="Amount in ৳"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">আপডেটের পর ব্যালেন্স হবে:</span>
                <span className="font-mono font-bold text-amber-300 text-base">
                  ৳{balanceAction === 'add' 
                    ? (displayBalance + Number(balanceAmount)).toFixed(2)
                    : (balanceAction === 'deduct' 
                        ? Math.max(0, displayBalance - Number(balanceAmount)).toFixed(2)
                        : Number(balanceAmount).toFixed(2))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBalance}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUpdatingBalance ? 'সংরক্ষণ হচ্ছে...' : 'ব্যালেন্স আপডেট নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <AuthGuard>
      <UserDashboardContent />
    </AuthGuard>
  );
}
