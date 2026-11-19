'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import DateFilterPills from '@/components/DateFilterPills';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OrderData } from '@/lib/types';
import { getClientCache, setClientCache, clearClientCache } from '@/lib/clientCache';
import { filterOrdersByDate, DateFilterType } from '@/lib/dateFilterUtils';
import { downloadReceiptPng, downloadOrdersAsZip } from '@/lib/receiptGenerator';
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
  const { user } = useAuth();
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

  // Edit Order Modal State (Admin / Super Admin)
  const [editOrder, setEditOrder] = useState<OrderData | null>(null);
  const [editStatus, setEditStatus] = useState<OrderData['status']>('Paid');
  const [editPaid, setEditPaid] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<OrderData['paymentMethod']>('Cash');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchOrders = async (silent = false) => {
    if (!silent && (!orders || orders.length === 0)) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/orders');
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
    setEditStatus(order.status);
    setEditPaid(order.paidAmount);
    setEditPaymentMethod(order.paymentMethod);
    setEditNotes(order.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    setSavingEdit(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editOrder._id || editOrder.orderNumber,
          status: editStatus,
          paidAmount: Number(editPaid),
          changeDue: Number(editPaid) - editOrder.totalBill,
          paymentMethod: editPaymentMethod,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrders(prev => {
            const next = prev.map(o => (o._id === json.data._id || o.orderNumber === json.data.orderNumber) ? json.data : o);
            setClientCache('orders_list', next);
            return next;
          });
          clearClientCache('members_list');
          setEditOrder(null);
          toast.success('Order details updated successfully!', 'Order Updated');
        }
      } else {
        toast.error('Failed to update order', 'Update Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating order', 'Update Failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteOrder = async (order: OrderData) => {
    try {
      const targetId = order._id || order.orderNumber;
      const res = await fetch(`/api/orders?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOrders(prev => {
          const next = prev.filter(o => o._id !== targetId && o.orderNumber !== targetId);
          setClientCache('orders_list', next);
          return next;
        });
        clearClientCache('members_list');
        toast.success(`Order ${order.orderNumber} deleted successfully.`, 'Order Deleted');
      } else {
        toast.error('Failed to delete order', 'Delete Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete order', 'Delete Failed');
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

  // Download all receipts currently filtered in this tab as a single ZIP
  const handleDownloadAllInTab = async () => {
    if (filteredOrders.length === 0) {
      toast.warning(
        language === 'bn' ? 'বর্তমান ট্যাবে কোনো অর্ডার নেই!' : 'No orders found in current tab!',
        'No Invoices'
      );
      return;
    }

    setIsDownloadingBulk(true);
    setDownloadProgress(0);
    try {
      const tabName = `${dateFilter}_${statusFilter}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadOrdersAsZip(filteredOrders, tabName, (completed) => {
        setDownloadProgress(completed);
      });
      toast.success(
        language === 'bn'
          ? `${filteredOrders.length} টি ইনভয়েস সফলভাবে জিপ ফাইল হিসেবে ডাউনলোড হয়েছে!`
          : `Downloaded ${filteredOrders.length} invoices as ZIP!`,
        'Invoices Downloaded 📦'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to download invoices', 'Download Error');
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-emerald-900/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'bn' ? 'সকল অর্ডারের হিস্টোরি ও রসিদ' : 'Master Orders Ledger & PNG Receipt Export'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">
              {language === 'bn' ? 'অর্ডার ডিটেইলস ও ভাউচার' : 'Order Details & Invoices'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'bn'
                ? 'সকল মেম্বারের খাবার অর্ডারের রিয়েল-টাইম তথ্য ও ১-ক্লিকে হাই-রেজোলিউশন PNG রসিদ ডাউনলোড'
                : 'Live master order directory — view all orders, audit payment math & 1-click download PNG receipts'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchOrders()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>রিফ্রেশ</span>
            </button>

            {/* Download All Invoices in Current Tab as ZIP */}
            <button
              onClick={handleDownloadAllInTab}
              disabled={filteredOrders.length === 0 || isDownloadingBulk}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              title={language === 'bn' ? 'বর্তমান ট্যাবের সকল রসিদ একসাথে ZIP আকারে ডাউনলোড' : 'Download all receipts in current tab as ZIP'}
            >
              {isDownloadingBulk ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {isDownloadingBulk
                  ? `${language === 'bn' ? 'প্রস্তুত হচ্ছে...' : 'Generating...'} ${downloadProgress}/${filteredOrders.length}`
                  : (language === 'bn' ? `সব ইনভয়েস ডাউনলোড (${filteredOrders.length})` : `Download All (${filteredOrders.length})`)}
              </span>
            </button>

            {/* Admin Add Order Button */}
            {isSuperOrAdmin && (
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <Plus className="w-4 h-4 text-slate-950" />
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
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{language === 'bn' ? 'মোট অর্ডার সংখ্যা' : 'Total Orders Placed'}</span>
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">{totalOrdersCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Real-time database sync</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{language === 'bn' ? 'মোট বিল্ড এমাউন্ট' : 'Total Billed Amount'}</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-amber-300">৳{totalBilled.toFixed(2)}</p>
            <p className="text-[11px] text-amber-400/80 mt-1">All orders combined</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{language === 'bn' ? 'পরিশোধিত অর্থ' : 'Total Collected'}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-300">৳{totalPaid.toFixed(2)}</p>
            <p className="text-[11px] text-emerald-400/80 mt-1">Cash, Wallet & Mobile</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{language === 'bn' ? 'বকেয়া / ডিউ অর্ডার' : 'Due / Pending Orders'}</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-rose-300">{totalDue}</p>
            <p className="text-[11px] text-rose-400/80 mt-1">Requires settlement</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'অর্ডার নম্বর, মেম্বার নাম বা খাবার দিয়ে খুঁজুন...' : 'Search by order #, member name, or dish...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Paid', 'Due', 'Pending', 'Delivered'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === status
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
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
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
            <Receipt className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">
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

                return (
                  <div
                    key={order._id || order.orderNumber}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg"
                  >
                    {/* Header: Order Number, Date, Status */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div>
                        <span className="font-mono font-bold text-amber-300 text-sm">{order.orderNumber}</span>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : isDue
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
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
                        <p className="font-bold text-white text-xs truncate">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{order.customerDepartment || 'Shopify Team'}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {order.paymentMethod}
                        </span>
                        {order.depositChangeToWallet && Number(order.changeDue) > 0 && (
                          <span className="text-[9px] text-emerald-400 font-mono font-bold mt-0.5">
                            +৳{Number(order.changeDue).toFixed(0)} Wallet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ordered Dishes */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
                      <p className="line-clamp-2 text-white font-medium">
                        {order.itemsText || (order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Catering Order')}
                      </p>
                      {order.notes && (
                        <p className="text-[10px] text-amber-400/80 italic mt-1 truncate">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>

                    {/* Financials & Actions */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'মোট বিল' : 'Total Bill'}</span>
                        <span className="font-mono font-bold text-amber-300 text-base">৳{order.totalBill.toFixed(2)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'পরিশোধ' : 'Paid'}</span>
                        <span className={`font-mono text-xs font-semibold ${order.paidAmount >= order.totalBill ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          ৳{order.paidAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(order)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs"
                          title="Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => downloadReceiptPng(order)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-900/60 text-emerald-400 border border-slate-700 text-xs"
                          title="Download PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {isSuperOrAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(order)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-amber-900/60 text-amber-400 border border-slate-700 text-xs"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 text-xs"
                              title="Delete"
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
            <div className="hidden md:block bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredOrders.map((order) => {
                    const isPaid = order.status === 'Paid';
                    const isDue = order.status === 'Due' || order.changeDue < 0;

                    return (
                      <tr key={order._id || order.orderNumber} className="hover:bg-slate-800/40 transition-colors">
                        
                        {/* Order Number & Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="font-mono font-bold text-amber-300">{order.orderNumber}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
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
                              <p className="font-bold text-white text-xs">{order.customerName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{order.customerDepartment || 'Shopify Team'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Items Breakdown */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-xs text-white font-medium line-clamp-2">
                            {order.itemsText || (order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Catering Order')}
                          </p>
                          {order.notes && (
                            <p className="text-[10px] text-amber-400/80 italic mt-0.5 truncate">
                              Note: {order.notes}
                            </p>
                          )}
                        </td>

                        {/* Total Bill */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-300 text-sm whitespace-nowrap">
                          ৳{order.totalBill.toFixed(2)}
                        </td>

                        {/* Paid Amount */}
                        <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                          <span className={order.paidAmount >= order.totalBill ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            ৳{order.paidAmount.toFixed(2)}
                          </span>
                          {order.depositChangeToWallet && Number(order.changeDue) > 0 && (
                            <span className="block text-[10px] text-emerald-400/90 font-medium">
                              (৳{Number(order.changeDue).toFixed(0)} credited)
                            </span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {order.paymentMethod}
                          </span>
                          {order.depositChangeToWallet && Number(order.changeDue) > 0 && (
                            <div className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                              +৳{Number(order.changeDue).toFixed(0)} Wallet
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : isDue
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : isDue ? 'bg-rose-400' : 'bg-amber-400'}`} />
                            <span>{order.status}</span>
                          </span>
                        </td>

                        {/* Receipt Download & Action Buttons */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* 📸 Download PNG Receipt (Available for ALL users) */}
                            <button
                              onClick={() => downloadReceiptPng(order)}
                              title={language === 'bn' ? 'PNG রসিদ ডাউনলোড করুন' : 'Download PNG Receipt'}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 text-[11px] font-semibold flex items-center gap-1 transition-all hover:scale-105 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              <span>PNG</span>
                            </button>

                            {/* View Voucher Invoice */}
                            <button
                              onClick={() => setSelectedInvoice(order)}
                              title="View Full Invoice"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Admin Edit & Delete buttons */}
                            {isSuperOrAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(order)}
                                  title="Edit Order"
                                  className="p-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order)}
                                  title="Delete Order"
                                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-colors"
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

      {/* Quick Order Modal for adding new orders */}
      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={async (data) => {
          try {
            const res = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (res.ok) {
              fetchOrders();
              toast.success(
                language === 'bn' 
                  ? 'অর্ডার সফলভাবে ডাটাবেজে যুক্ত হয়েছে!' 
                  : 'Order added and saved to database successfully!',
                'Order Placed 🎉'
              );
            } else {
              toast.error('Failed to save order', 'Error');
            }
          } catch (e: any) {
            toast.error(e.message || 'Error saving order', 'Failed');
          }
        }}
      />

      {/* Invoice Modal for viewing print format */}
      {selectedInvoice && (
        <InvoiceModal
          order={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Admin Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-serif font-bold text-white text-base">
                  Edit Order: {editOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-slate-400">Customer: {editOrder.customerName}</p>
              </div>
              <button onClick={() => setEditOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">Order Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="Paid">Paid</option>
                  <option value="Due">Due</option>
                  <option value="Pending">Pending</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
                  Paid Amount (৳) — Bill: ৳{editOrder.totalBill}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editPaid}
                  onChange={(e) => setEditPaid(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">Payment Method</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Wallet">Wallet</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Order notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold"
                >
                  {savingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
