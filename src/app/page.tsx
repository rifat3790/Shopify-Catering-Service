'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, initialOrders } from '@/lib/types';
import Link from 'next/link';
import { 
  Sparkles, 
  Utensils, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Calculator, 
  CheckCircle, 
  MenuSquare,
  Coffee,
  Database,
  Users
} from 'lucide-react';

export default function HomePage() {
  const { language } = useLanguage();
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
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

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/stats')
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        if (oData.success && oData.data) {
          setOrders(oData.data);
        }
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        if (sData.success && sData.data) {
          setStats(sData.data);
        }
      }
    } catch (err) {
      console.warn("Using offline / initial mock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = async (orderData: Partial<OrderData>) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) {
        await fetchDashboardData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert('Error creating order: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: OrderData['status']) => {
    try {
      setOrders(prev => prev.map(o => (o._id === id || o.orderNumber === id) ? { ...o, status: newStatus } : o));
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(language === 'bn' ? 'আপনি কি এই অর্ডারটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this order?')) {
      return;
    }
    try {
      setOrders(prev => prev.filter(o => o._id !== id && o.orderNumber !== id));
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Left-Side Dashboard Sidebar */}
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      {/* Main Full-Width Content Container */}
      <div className="flex-1 w-full min-w-0 flex flex-col">
        
        {/* Hero Banner Section */}
        <section className="relative overflow-hidden px-4 sm:px-6 lg:px-10 pt-8 pb-10 bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950 border-b border-emerald-900/30">
          <div className="absolute top-0 right-1/4 w-[600px] h-[250px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === 'bn' ? 'অফিসিয়াল ক্যাটারিং ও রিফ্রেশমেন্ট পোর্টাল' : 'Enterprise Corporate Catering Suite'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-white leading-tight">
                {language === 'bn' ? (
                  <>
                    শপিফাই <span className="bg-gradient-to-r from-emerald-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">ক্যাটারিং সার্ভিস</span> — দৈনিক ট্র্যাকার
                  </>
                ) : (
                  <>
                    Shopify <span className="bg-gradient-to-r from-emerald-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">Catering Service</span> — Live Ledger
                  </>
                )}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                {language === 'bn'
                  ? 'দৈনিক খাবার, বিকেলের নাস্তা, সিঙ্গারা-চমচা ও এক্সিকিউটিভ লাঞ্চের আধুনিক ডিজিটাল ট্র্যাকার। রিয়েল-টাইম হিসাব, ক্যাশ কালেকশন ও ইনস্ট্যান্ট রসিদ ইমেজ ডাউনলোড।'
                  : 'Real-time billing ledger, individual customer balances, cash tender velocity, and one-click receipt image export.'}
              </p>

              {/* Quick Action Pills */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <Utensils className="w-4 h-4 text-slate-950" />
                  <span>{language === 'bn' ? '+ নতুন অর্ডার এন্ট্রি' : '+ Enter Order'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>

                <Link
                  href="/members"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-emerald-800/80 font-semibold text-xs transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>{language === 'bn' ? 'মেম্বার তালিকা' : 'Member Directory'}</span>
                </Link>

                <Link
                  href="/pos"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-semibold text-xs transition-all flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bn' ? 'কাউন্টার পিওএস' : 'Counter POS'}</span>
                </Link>
              </div>
            </div>

            {/* Quick Summary Snapshot Card */}
            <div className="w-full xl:w-96 p-5 rounded-3xl bg-slate-900/90 border border-emerald-800/60 shadow-xl backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Daily Refreshment Log</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">Auto Reconciled</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {stats.collectionRate} Rate
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Total Billed Food:</span>
                  <span className="font-mono font-bold text-amber-300">৳{stats.totalBill.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Collected Cash:</span>
                  <span className="font-mono font-bold text-teal-300">৳{stats.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Customer Refund / Change:</span>
                  <span className="font-mono font-bold text-emerald-400">৳{stats.totalRefundChange.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full-Width Workspace Container */}
        <main className="w-full px-4 sm:px-6 lg:px-10 py-8 space-y-8 flex-1">
          
          {/* 5 Key Metric Summary Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{language === 'bn' ? 'লাইভ কালেকশন ও বিল পরিসংখ্যান' : 'Live Collection & Order Overview'}</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Real-time Reactive Sync</span>
            </div>

            <MetricsOverview stats={stats} isLoading={loading} />
          </div>

          {/* Full-Width Live Tracker Table */}
          <section className="space-y-4">
            <LiveTrackerTable
              orders={orders}
              onOpenNewOrder={() => setIsOrderModalOpen(true)}
              onSelectInvoice={(order) => setSelectedInvoice(order)}
              onUpdateStatus={handleUpdateStatus}
              onDeleteOrder={handleDeleteOrder}
              isLoading={loading}
            />
          </section>

        </main>

      </div>

      {/* Quick Order Modal with Dynamic Custom Items */}
      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={handleCreateOrder}
      />

      {/* Printable & Downloadable Invoice Modal with Image Export */}
      <InvoiceModal
        order={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
