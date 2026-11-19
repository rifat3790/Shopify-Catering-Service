'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData } from '@/lib/types';
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

function downloadReceiptPng(order: OrderData) {
  const canvas = document.createElement('canvas');
  const width = 800;
  const padding = 40;
  const items = order.items && order.items.length > 0
    ? order.items
    : [{ name: order.itemsText || 'Catering Order', quantity: 1, unitPrice: order.totalBill, subtotal: order.totalBill }];
  
  const estimatedHeight = Math.max(580, 520 + (items.length * 36));
  canvas.width = width;
  canvas.height = estimatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient: Dark luxury slate
  const bgGrad = ctx.createLinearGradient(0, 0, width, estimatedHeight);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, estimatedHeight);

  // Border & Gold Accent Top
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, width - 30, estimatedHeight - 30);

  const goldGrad = ctx.createLinearGradient(0, 0, width, 0);
  goldGrad.addColorStop(0, '#059669');
  goldGrad.addColorStop(0.5, '#fbbf24');
  goldGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(15, 15, width - 30, 8);

  // Brand Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px serif';
  ctx.fillText('Shopify Catering Service', padding, 65);

  ctx.fillStyle = '#34d399';
  ctx.font = '12px sans-serif';
  ctx.fillText('Official Catering Receipt & Enterprise Invoice', padding, 85);

  // Order Info
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  ctx.fillText(`Order No: ${order.orderNumber}`, padding, 120);
  ctx.fillText(`Date: ${new Date(order.orderDate).toLocaleString()}`, padding, 140);
  ctx.fillText(`Payment: ${order.paymentMethod}`, padding, 160);

  // Customer Info Box
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(width - 320, 100, 280, 75);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(width - 320, 100, 280, 75);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px sans-serif';
  ctx.fillText('CUSTOMER / BILLED TO:', width - 305, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(order.customerName, width - 305, 140);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText(order.customerDepartment || 'Shopify Team', width - 305, 160);

  // Items Table Header
  let y = 205;
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(padding, y, width - (padding * 2), 32);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ITEM DESCRIPTION', padding + 15, y + 21);
  ctx.fillText('QTY', width - 280, y + 21);
  ctx.fillText('RATE', width - 190, y + 21);
  ctx.fillText('TOTAL', width - 100, y + 21);

  // Items Rows
  y += 45;
  ctx.font = '13px sans-serif';
  items.forEach((item, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#0f172a';
    ctx.fillRect(padding, y - 15, width - (padding * 2), 28);

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(item.name, padding + 15, y + 4);
    ctx.fillText(`${item.quantity}`, width - 275, y + 4);
    ctx.fillText(`৳${item.unitPrice.toFixed(2)}`, width - 190, y + 4);
    ctx.fillText(`৳${item.subtotal.toFixed(2)}`, width - 100, y + 4);
    y += 32;
  });

  // Totals Section
  y += 15;
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  y += 25;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Total Bill Amount:', width - 280, y);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`৳${order.totalBill.toFixed(2)}`, width - 120, y);

  y += 25;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Amount Paid:', width - 280, y);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`৳${order.paidAmount.toFixed(2)}`, width - 120, y);

  y += 25;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(order.changeDue >= 0 ? 'Change Returned:' : 'Balance Due:', width - 280, y);
  ctx.font = '14px monospace';
  ctx.fillStyle = order.changeDue >= 0 ? '#38bdf8' : '#f87171';
  ctx.fillText(`৳${Math.abs(order.changeDue).toFixed(2)}`, width - 120, y);

  // Status Stamp
  ctx.save();
  ctx.translate(padding + 90, y - 20);
  ctx.rotate(-0.12);
  ctx.strokeStyle = order.status === 'Paid' ? '#10b981' : (order.status === 'Due' ? '#f43f5e' : '#f59e0b');
  ctx.lineWidth = 3;
  ctx.strokeRect(-65, -22, 130, 44);
  ctx.fillStyle = order.status === 'Paid' ? '#10b981' : (order.status === 'Due' ? '#f43f5e' : '#f59e0b');
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(order.status.toUpperCase(), 0, 7);
  ctx.restore();

  // Footer
  ctx.textAlign = 'center';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Thank you for catering with Shopify Catering Service • Verified Digital Invoice', width / 2, estimatedHeight - 30);

  // Trigger Download
  const link = document.createElement('a');
  link.download = `receipt-${order.orderNumber}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function OrdersPageContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Edit Order Modal State (Admin / Super Admin)
  const [editOrder, setEditOrder] = useState<OrderData | null>(null);
  const [editStatus, setEditStatus] = useState<OrderData['status']>('Paid');
  const [editPaid, setEditPaid] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<OrderData['paymentMethod']>('Cash');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrders(json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
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
          setOrders(prev => prev.map(o => (o._id === json.data._id || o.orderNumber === json.data.orderNumber) ? json.data : o));
          setEditOrder(null);
        }
      }
    } catch (err: any) {
      alert('Error updating order: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteOrder = async (order: OrderData) => {
    if (!window.confirm(`Are you sure you want to permanently delete order ${order.orderNumber}? If paid via Wallet, balance will be refunded.`)) {
      return;
    }

    try {
      const targetId = order._id || order.orderNumber;
      const res = await fetch(`/api/orders?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o._id !== targetId && o.orderNumber !== targetId));
      }
    } catch (err: any) {
      alert('Failed to delete order: ' + err.message);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (o.itemsText && o.itemsText.toLowerCase().includes(search.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.includes(search));

    const matchesStatus = statusFilter === 'All' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary Metrics
  const totalOrdersCount = orders.length;
  const totalBilled = orders.reduce((sum, o) => sum + (o.totalBill || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalDue = orders.filter(o => o.status === 'Due' || o.changeDue < 0).length;

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
              onClick={fetchOrders}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>রিফ্রেশ</span>
            </button>

            {/* Admin Add Order Button */}
            {isSuperOrAdmin && (
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>{language === 'bn' ? '+ নতুন অর্ডার যোগ করুন' : '+ Add New Order'}</span>
              </button>
            )}
          </div>
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
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
                        </td>

                        {/* Payment Method */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {order.paymentMethod}
                          </span>
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
        )}

      </main>

      {/* Quick Order Modal for adding new orders */}
      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={async (data) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          fetchOrders();
          alert(language === 'bn' ? 'অর্ডার সফলভাবে ডাটাবেজে যুক্ত হয়েছে!' : 'Order added and saved to database successfully!');
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
