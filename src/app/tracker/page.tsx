'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, initialOrders } from '@/lib/types';
import { TableProperties, RefreshCw } from 'lucide-react';

export default function TrackerPage() {
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

  const fetchTrackerData = async () => {
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
      console.warn("Using cached data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
    const interval = setInterval(fetchTrackerData, 8000);
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
        await fetchTrackerData();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: OrderData['status']) => {
    setOrders(prev => prev.map(o => (o._id === id || o.orderNumber === id) ? { ...o, status: newStatus } : o));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTrackerData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(language === 'bn' ? 'অর্ডারটি মুছে ফেলতে চান?' : 'Delete order?')) return;
    setOrders(prev => prev.filter(o => o._id !== id && o.orderNumber !== id));
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      fetchTrackerData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-900/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TableProperties className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-white">
                {language === 'bn' ? 'দৈনিক অর্ডার ও পেমেন্ট ট্র্যাকার লেজার' : 'Daily Order & Payment Tracker Ledger'}
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              {language === 'bn' 
                ? 'রিয়েল-টাইম বিল কালেকশন, কাস্টমার ব্যালেন্স ও ক্যাটারিং সেলস রেকর্ড'
                : 'Real-time billing, collection status, customer cash balance, and refreshment records'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTrackerData()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md"
            >
              + {language === 'bn' ? 'নতুন এন্ট্রি' : 'New Entry'}
            </button>
          </div>
        </div>

        {/* Top 5 Metrics */}
        <MetricsOverview stats={stats} isLoading={loading} />

        {/* Google Sheet Style Table */}
        <LiveTrackerTable
          orders={orders}
          onOpenNewOrder={() => setIsOrderModalOpen(true)}
          onSelectInvoice={(order) => setSelectedInvoice(order)}
          onUpdateStatus={handleUpdateStatus}
          onDeleteOrder={handleDeleteOrder}
          isLoading={loading}
        />
      </main>

      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={handleCreateOrder}
      />

      <InvoiceModal
        order={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
