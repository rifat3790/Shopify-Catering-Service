'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, initialOrders, initialMenuItems, MenuItemData } from '@/lib/types';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Utensils, 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  RefreshCw,
  SlidersHorizontal,
  TableProperties,
  ArrowRight
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(initialMenuItems);
  const [stats, setStats] = useState({
    ordersCount: 4,
    completedOrdersCount: 4,
    totalOrders: 7,
    totalBill: 130,
    totalPaid: 450,
    totalRefundChange: 320,
    totalDue: 0,
    collectionRate: "346.2%",
    rawCollectionRate: 346.2
  });
  const [loading, setLoading] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');

  const fetchAdminData = async () => {
    try {
      const [ordRes, statRes, menuRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/stats'),
        fetch('/api/menu')
      ]);

      if (ordRes.ok) {
        const o = await ordRes.json();
        if (o.success && o.data) setOrders(o.data);
      }
      if (statRes.ok) {
        const s = await statRes.json();
        if (s.success && s.data) setStats(s.data);
      }
      if (menuRes.ok) {
        const m = await menuRes.json();
        if (m.success && m.data) setMenuItems(m.data);
      }
    } catch (e) {
      console.warn('Using cached data');
    } finally {
      setLoading(false);
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
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      {/* Left Sidebar Navigation */}
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Manager
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' ? 'দৈনিক অর্ডার প্রস্তুত, মেনু ম্যানেজমেন্ট ও ক্যাশিয়ার হিসাব নিকাশ' : 'Kitchen workflow, menu pricing control, and daily customer accounts'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href="/super-admin"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-amber-400 border border-amber-500/30"
              >
                👑 Super Admin
              </Link>
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md"
              >
                + {language === 'bn' ? 'অর্ডার এন্ট্রি' : 'New Order'}
              </button>
            </div>
          </div>

          {/* Tab switch */}
          <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-2xl w-fit border border-slate-800">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'orders' ? 'bg-emerald-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 {language === 'bn' ? 'অর্ডার ও পেমেন্ট ট্র্যাকার' : 'Orders & Ledger'}
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'menu' ? 'bg-emerald-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🍲 {language === 'bn' ? 'মেনু ক্যাটালগ কন্ট্রোল' : 'Menu Management'}
            </button>
          </div>

          {activeTab === 'orders' ? (
            <div className="space-y-6">
              <MetricsOverview stats={stats} isLoading={loading} />
              <LiveTrackerTable
                orders={orders}
                onOpenNewOrder={() => setIsOrderModalOpen(true)}
                onSelectInvoice={(order) => setSelectedInvoice(order)}
                onUpdateStatus={handleUpdateStatus}
                onDeleteOrder={handleDeleteOrder}
                isLoading={loading}
              />
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

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Available
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

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
