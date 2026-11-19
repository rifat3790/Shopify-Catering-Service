'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OrderData } from '@/lib/types';
import { TableProperties, RefreshCw } from 'lucide-react';

function TrackerContent() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderData[]>([]);
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
      console.warn("Using live data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
    const interval = setInterval(fetchTrackerData, 10000);
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
        toast.success(
          language === 'bn' ? 'অর্ডার সফলভাবে ডাটাবেজে যুক্ত হয়েছে!' : 'Order created successfully!',
          'Order Added 🎉'
        );
        await fetchTrackerData();
      } else {
        toast.error(data.error || 'Failed to create order', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating order', 'Failed');
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
        toast.success(`Order status updated to ${newStatus}`, 'Status Updated');
        fetchTrackerData();
      } else {
        toast.error('Failed to update status', 'Error');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error updating status', 'Failed');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    setOrders(prev => prev.filter(o => o._id !== id && o.orderNumber !== id));
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Order removed from tracker', 'Order Deleted');
        fetchTrackerData();
      } else {
        toast.error('Failed to delete order', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting order', 'Failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-[1720px] w-full mx-auto">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-900/40">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
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

            <div className="flex items-center gap-2 self-start sm:self-auto">
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

          {/* Live Dynamic Table */}
          <LiveTrackerTable
            orders={orders}
            onOpenNewOrder={() => setIsOrderModalOpen(true)}
            onSelectInvoice={(order) => setSelectedInvoice(order)}
            onUpdateStatus={handleUpdateStatus}
            onDeleteOrder={handleDeleteOrder}
            isLoading={loading}
          />
        </main>
      </div>

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

export default function TrackerPage() {
  return (
    <AuthGuard allowedRoles={['super_admin', 'admin', 'staff']}>
      <TrackerContent />
    </AuthGuard>
  );
}
