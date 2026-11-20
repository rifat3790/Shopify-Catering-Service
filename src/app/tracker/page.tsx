'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import DateFilterPills from '@/components/DateFilterPills';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OrderData } from '@/lib/types';
import { getClientCache, setClientCache, clearClientCache } from '@/lib/clientCache';
import { filterOrdersByDate, calculateStatsFromOrders, DateFilterType } from '@/lib/dateFilterUtils';
import { TableProperties, RefreshCw } from 'lucide-react';

function TrackerContent() {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Instant 0ms cache initialize
  const [orders, setOrders] = useState<OrderData[]>(() => {
    return getClientCache<OrderData[]>('orders_list') || [];
  });
  const [totalBalance, setTotalBalance] = useState<number>(() => {
    return getClientCache<number>('total_balance') || 0;
  });
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getClientCache<OrderData[]>('orders_list');
    return !cached || cached.length === 0;
  });
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);

  const fetchTrackerData = async () => {
    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/users')
      ]);
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        if (oData.success && oData.data) {
          setOrders(oData.data);
          setClientCache('orders_list', oData.data);
        }
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData.success && Array.isArray(uData.data)) {
          const sum = uData.data.reduce((acc: number, curr: any) => acc + (Number(curr.balance) || 0), 0);
          setTotalBalance(sum);
          setClientCache('total_balance', sum);
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

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    return filterOrdersByDate(orders, dateFilter);
  }, [orders, dateFilter]);

  // Dynamic calculated stats for the selected date range
  const dynamicStats = useMemo(() => {
    return calculateStatsFromOrders(filteredOrders, totalBalance);
  }, [filteredOrders, totalBalance]);

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
        clearClientCache();
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
        clearClientCache();
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 transition-all hover:scale-105 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
              </button>
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all hover:scale-105"
              >
                + {language === 'bn' ? 'নতুন এন্ট্রি' : 'New Entry'}
              </button>
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

          {/* Top 5 Metrics Filtered Dynamically */}
          <MetricsOverview stats={dynamicStats} isLoading={loading} />

          {/* Live Dynamic Table Filtered by Date */}
          <LiveTrackerTable
            orders={filteredOrders}
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
