'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import DateFilterPills from '@/components/DateFilterPills';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OrderData } from '@/lib/types';
import { getClientCache, setClientCache, clearClientCache } from '@/lib/clientCache';
import { filterOrdersByDate, DateFilterType } from '@/lib/dateFilterUtils';
import { downloadReceiptPng, downloadFullOrdersTableAsImage } from '@/lib/receiptGenerator';
import { LuxurySpinnerIcon } from '@/components/LuxuryLoader';
import { 
  ClipboardList, 
  Search, 
  Download, 
  Eye, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Wallet,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  X
} from 'lucide-react';

function OrdersPageContent() {
  const { user, refreshUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Instant 0ms cache initialize
  const [orders, setOrders] = useState<OrderData[]>(() => {
    return getClientCache<OrderData[]>('orders_list') || [];
  });
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getClientCache<OrderData[]>('orders_list');
    return !cached || cached.length === 0;
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Edit Order & Delete Confirmation Modal State
  const [editOrder, setEditOrder] = useState<OrderData | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<OrderData | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchOrders = async (silent = false) => {
    if (!silent && (!orders || orders.length === 0)) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/orders?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrders(json.data);
          setClientCache('orders_list', json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
  }, []);

  const handleOpenEdit = (order: OrderData) => {
    setEditOrder(order);
  };

  const handleDeleteOrder = (order: OrderData) => {
    setDeleteConfirmOrder(order);
  };

  const executeDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    setIsDeletingOrder(true);
    try {
      const targetId = deleteConfirmOrder._id || deleteConfirmOrder.orderNumber;
      const res = await fetch(`/api/orders?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (res.ok) {
        clearClientCache();
        setOrders(prev => {
          const next = prev.filter(o => o._id !== targetId && o.orderNumber !== targetId);
          setClientCache('orders_list', next);
          return next;
        });
        if (refreshUser) refreshUser().catch(() => {});
        toast.success(`Order ${deleteConfirmOrder.orderNumber} deleted successfully.`, 'Order Deleted');
        setDeleteConfirmOrder(null);
      } else {
        toast.error('Failed to delete order', 'Delete Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete order', 'Delete Failed');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Filter orders by date range
  const ordersInDateRange = useMemo(() => {
    return filterOrdersByDate(orders, dateFilter);
  }, [orders, dateFilter]);

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

  // Filtered orders within selected date period
  const filteredOrders = ordersInDateRange.filter((o) => {
    const matchesSearch = 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (o.itemsText && o.itemsText.toLowerCase().includes(search.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.includes(search));

    const matchesStatus = statusFilter === 'All' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary Metrics calculated dynamically for the selected date period
  const totalOrdersCount = ordersInDateRange.length;
  const totalBilled = ordersInDateRange.reduce((sum, o) => sum + (o.totalBill || 0), 0);
  const totalPaid = ordersInDateRange.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalDue = ordersInDateRange.filter(o => o.status === 'Due' || o.changeDue < 0).length;

  // Download ONE consolidated master orders table image containing all details in the current tab
  const handleDownloadAllInTab = async () => {
    if (filteredOrders.length === 0) {
      toast.warning(
        language === 'bn' ? 'বর্তমান ট্যাবে কোনো অর্ডার নেই!' : 'No orders found in current tab!',
        'No Orders'
      );
      return;
    }

    setIsDownloadingBulk(true);
    try {
      const tabName = `${dateFilter}_${statusFilter}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadFullOrdersTableAsImage(
        filteredOrders,
        `${dateFilter.toUpperCase()} (${statusFilter})`,
        'Shopify Catering — Master Orders & Payment Ledger'
      );
      toast.success(
        language === 'bn'
          ? `${filteredOrders.length} টি অর্ডারের সম্পূর্ণ টেবিল ইমেজ (PNG) হিসেবে ডাউনলোড হয়েছে!`
          : `Master ledger table (${filteredOrders.length} orders) downloaded as 1 PNG image!`,
        'Master Table Downloaded'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate master table image', 'Download Error');
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-emerald-900/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/80 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
              <ClipboardList className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{language === 'bn' ? 'সকল অর্ডারের হিস্টোরি ও রসিদ' : 'Master Orders Ledger & PNG Receipt Export'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white">
              {language === 'bn' ? 'অর্ডার ডিটেইলস ও ভাউচার' : 'Order Details & Invoices'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'bn'
                ? 'সকল মেম্বারের খাবার অর্ডারের রিয়েল-টাইম তথ্য ও ১-ক্লিকে হাই-রেজোলিউশন PNG রসিদ ডাউনলোড'
                : 'Live master order directory — view all orders, audit payment math & 1-click download PNG receipts'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fetchOrders()}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>রিফ্রেশ</span>
            </button>

            {/* Download Full Master Table Image */}
            <button
              onClick={handleDownloadAllInTab}
              disabled={filteredOrders.length === 0 || isDownloadingBulk}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              title={language === 'bn' ? 'সম্পূর্ণ অর্ডার টেবিল একটি ইমেজ (PNG) হিসেবে ডাউনলোড করুন' : 'Download full orders table with all details as a single PNG image'}
            >
              {isDownloadingBulk ? (
                <LuxurySpinnerIcon size="xs" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              )}
              <span>
                {isDownloadingBulk
                  ? (language === 'bn' ? 'টেবিল ইমেজ তৈরি হচ্ছে...' : 'Generating Table Image...')
                  : (language === 'bn' ? `সব অর্ডার টেবিল ডাউনলোড (${filteredOrders.length})` : `Download All (${filteredOrders.length})`)}
              </span>
            </button>

            {/* Admin Add Order Button */}
            {isSuperOrAdmin && (
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{language === 'bn' ? 'নতুন অর্ডার যোগ করুন' : 'Add New Order'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Range Filter Pills (Defaults to Today) */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <DateFilterPills
            selected={dateFilter}
            onChange={setDateFilter}
            counts={dateCounts}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-1">
              <span>{language === 'bn' ? 'মোট অর্ডার সংখ্যা' : 'Total Orders Placed'}</span>
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{totalOrdersCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">Real-time database sync</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-amber-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-1">
              <span>{language === 'bn' ? 'মোট বিল্ড এমাউন্ট' : 'Total Billed Amount'}</span>
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-300">৳{totalBilled.toFixed(2)}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/90 font-medium mt-1">All orders combined</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-emerald-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-1">
              <span>{language === 'bn' ? 'পরিশোধিত অর্থ' : 'Total Collected'}</span>
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-300">৳{totalPaid.toFixed(2)}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/90 font-medium mt-1">Cash, Wallet & Mobile</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-rose-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-1">
              <span>{language === 'bn' ? 'বকেয়া / ডিউ অর্ডার' : 'Due / Pending Orders'}</span>
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-300">{totalDue}</p>
            <p className="text-xs text-rose-700 dark:text-rose-300/90 font-medium mt-1">Requires settlement</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'অর্ডার নম্বর, মেম্বার নাম বা খাবার দিয়ে খুঁজুন...' : 'Search by order #, member name, or dish...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Paid', 'Due', 'Pending', 'Delivered'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === status
                    ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Master List Table */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LuxuryLoader size="md" message="Loading master order ledger..." />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 space-y-3">
            <Receipt className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No catering orders found'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'bn'
                ? 'নতুন খাবার অর্ডার দিতে উপরের "+ নতুন অর্ডার যোগ করুন" অথবা সাইডবারের বাটনে ক্লিক করুন।'
                : 'Click "+ Add New Order" or the sidebar button to place a fresh order.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Touch-Friendly Order Cards View (md:hidden) */}
            <div className="md:hidden space-y-3">
              {filteredOrders.map((order) => {
                const isPaid = order.status === 'Paid';
                const isDue = order.status === 'Due' || order.changeDue < 0;
                const isOwner = Boolean(
                  user && (
                    (order.userId && (order.userId === user.uid || order.userId === (user as any).id || order.userId.toLowerCase() === user.email?.toLowerCase())) ||
                    (order.customerEmail && user.email && order.customerEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
                    (order.customerName && (
                      (user.name && order.customerName.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
                      (user.displayName && order.customerName.toLowerCase().trim() === user.displayName.toLowerCase().trim())
                    ))
                  )
                );
                const canManage = isSuperOrAdmin || isOwner;

                return (
                  <div
                    key={order._id || order.orderNumber}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-md"
                  >
                    {/* Header: Order Number, Date, Status */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
                      <div>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm">{order.orderNumber}</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        isPaid
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                          : isDue
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-2.5">
                      <img
                        src={order.customerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customerName || 'User')}&background=047857&color=fff`}
                        alt={order.customerName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customerName || 'User')}&background=047857&color=fff`;
                        }}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{order.customerName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{order.customerDepartment || 'Shopify Team'}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {order.paymentMethod}
                        </span>
                        {order.depositChangeToWallet && Number(order.changeDue) > 0 && (
                          <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono font-bold mt-0.5">
                            +৳{Number(order.changeDue).toFixed(0)} Wallet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ordered Dishes */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                      <p className="line-clamp-2 text-slate-900 dark:text-white font-medium">
                        {order.itemsText || (order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Catering Order')}
                      </p>
                      {order.notes && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400/80 italic mt-1 truncate">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>

                    {/* Financials & Actions */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === 'bn' ? 'মোট বিল' : 'Total Bill'}</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-base">৳{order.totalBill.toFixed(2)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === 'bn' ? 'পরিশোধ' : 'Paid'}</span>
                        <span className={`font-mono text-xs font-semibold ${order.paidAmount >= order.totalBill ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                          ৳{order.paidAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(order)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 text-xs"
                          title="Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => downloadReceiptPng(order)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-slate-700 text-xs"
                          title="Download PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(order)}
                              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-slate-700 text-xs"
                              title={isOwner && !isSuperOrAdmin ? "Edit My Order" : "Edit"}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-slate-700 text-xs"
                              title={isOwner && !isSuperOrAdmin ? "Delete My Order" : "Delete"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Expansive Master Ledger Table (hidden md:block) */}
            <div className="hidden md:block bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Order</th>
                    <th className="px-4 py-3.5">Member / Customer</th>
                    <th className="px-4 py-3.5">Items Ordered</th>
                    <th className="px-4 py-3.5 text-right">Total Bill</th>
                    <th className="px-4 py-3.5 text-right">Paid</th>
                    <th className="px-4 py-3.5 text-center">Payment</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Receipt & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredOrders.map((order) => {
                    const isPaid = order.status === 'Paid';
                    const isDue = order.status === 'Due' || order.changeDue < 0;
                    const isOwner = Boolean(
                      user && (
                        (order.userId && (order.userId === user.uid || order.userId === (user as any).id || order.userId.toLowerCase() === user.email?.toLowerCase())) ||
                        (order.customerEmail && user.email && order.customerEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
                        (order.customerName && (
                          (user.name && order.customerName.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
                          (user.displayName && order.customerName.toLowerCase().trim() === user.displayName.toLowerCase().trim())
                        ))
                      )
                    );
                    const canManage = isSuperOrAdmin || isOwner;

                    return (
                      <tr key={order._id || order.orderNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        
                        {/* Order Number & Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="font-mono font-bold text-amber-700 dark:text-amber-300">{order.orderNumber}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                          </p>
                        </td>

                        {/* Customer Info */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={order.customerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customerName || 'User')}&background=047857&color=fff`}
                              alt={order.customerName}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customerName || 'User')}&background=047857&color=fff`;
                              }}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs">{order.customerName}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{order.customerDepartment || 'Shopify Team'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Items Breakdown */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-xs text-slate-900 dark:text-white font-medium line-clamp-2">
                            {order.itemsText || (order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Catering Order')}
                          </p>
                          {order.notes && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400/80 italic mt-0.5 truncate">
                              Note: {order.notes}
                            </p>
                          )}
                        </td>

                        {/* Total Bill */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-700 dark:text-amber-300 text-sm whitespace-nowrap">
                          ৳{order.totalBill.toFixed(2)}
                        </td>

                        {/* Paid Amount */}
                        <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                          <span className={order.paidAmount >= order.totalBill ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                            ৳{order.paidAmount.toFixed(2)}
                          </span>
                          {order.depositChangeToWallet && Number(order.changeDue) > 0 && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400/90 font-medium">
                              (৳{Number(order.changeDue).toFixed(0)} credited)
                            </span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {order.paymentMethod}
                          </span>
                          {order.depositChangeToWallet && Number(order.changeDue) > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-0.5">
                              +৳{Number(order.changeDue).toFixed(0)} Wallet
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                              : isDue
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : isDue ? 'bg-rose-500' : 'bg-amber-500'}`} />
                            <span>{order.status}</span>
                          </span>
                        </td>

                        {/* Receipt Download & Action Buttons */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2.5">
                            
                            {/* 📸 Download PNG Receipt (Available for ALL users) */}
                            <button
                              onClick={() => downloadReceiptPng(order)}
                              title={language === 'bn' ? 'PNG রসিদ ডাউনলোড করুন' : 'Download PNG Receipt'}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-600/50 text-[11px] font-semibold flex items-center gap-1 transition-all hover:scale-105 shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>PNG</span>
                            </button>

                            {/* View Voucher Invoice */}
                            <button
                              onClick={() => setSelectedInvoice(order)}
                              title="View Full Invoice"
                              className="p-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all hover:scale-105 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit & Delete buttons (For Admins OR Order Owner) */}
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(order)}
                                  title={isOwner && !isSuperOrAdmin ? "Edit My Order" : "Edit Order"}
                                  className="p-1.5 rounded-xl bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30 transition-all hover:scale-105 shadow-xs"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order)}
                                  title={isOwner && !isSuperOrAdmin ? "Delete My Order" : "Delete Order"}
                                  className="p-1.5 rounded-xl bg-rose-50/90 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-500/20 dark:border-rose-500/30 transition-all hover:scale-105 shadow-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
        )}

      </main>

      {/* Quick Order Modal for adding & editing full order items, quantities & details */}
      <QuickOrderModal
        isOpen={isOrderModalOpen || !!editOrder}
        editingOrder={editOrder}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditOrder(null);
        }}
        onSubmit={async (data) => {
          const isEditing = Boolean(editOrder || data._id || data.orderNumber);
          const res = await fetch('/api/orders', {
            method: isEditing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.success) {
            throw new Error(json.error || (isEditing ? 'Failed to update order' : 'Failed to save order'));
          }
          clearClientCache();
          if (isEditing && json.data) {
            setOrders(prev => {
              const next = prev.map(o =>
                (o._id === json.data._id || o.orderNumber === json.data.orderNumber) ? json.data : o
              );
              setClientCache('orders_list', next);
              return next;
            });
          } else {
            fetchOrders();
          }
          if (refreshUser) refreshUser().catch(() => {});
          setEditOrder(null);
        }}
      />

      {/* Invoice Modal for viewing print format */}
      {selectedInvoice && (
        <InvoiceModal
          order={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Executive Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmOrder}
        onClose={() => !isDeletingOrder && setDeleteConfirmOrder(null)}
        onConfirm={executeDeleteOrder}
        title={language === 'bn' ? 'অর্ডার স্থায়ীভাবে মুছে ফেলুন' : 'Delete Order Permanently'}
        description={
          language === 'bn'
            ? 'আপনি কি নিশ্চিত যে এই অর্ডারটি তালিকা ও ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলতে চান?'
            : 'Are you sure you want to permanently remove this order from the ledger?'
        }
        highlightText={
          deleteConfirmOrder
            ? `${deleteConfirmOrder.orderNumber} • ${deleteConfirmOrder.customerName} (৳${deleteConfirmOrder.totalBill})`
            : undefined
        }
        confirmText={language === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete Order'}
        cancelText={language === 'bn' ? 'বাতিল' : 'Cancel'}
        variant="danger"
        loading={isDeletingOrder}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersPageContent />
    </AuthGuard>
  );
}
