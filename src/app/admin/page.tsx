'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import MetricsOverview from '@/components/MetricsOverview';
import LiveTrackerTable from '@/components/LiveTrackerTable';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, MenuItemData } from '@/lib/types';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ChefHat, 
  Utensils, 
  Plus, 
  RefreshCw,
  PlusCircle,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';

function AdminPageContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
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
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');

  // Menu item modal
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishNameBn, setDishNameBn] = useState('');
  const [dishPrice, setDishPrice] = useState<number>(20);
  const [dishCategory, setDishCategory] = useState<MenuItemData['category']>('Refreshments');
  const [dishImageUrl, setDishImageUrl] = useState('');

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
      console.warn('Using live state');
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
                  {language === 'bn' ? 'দৈনিক অর্ডার প্রস্তুত, মেনু ম্যানেজমেন্ট ও ক্যাশিয়ার হিসাব নিকাশ' : 'Kitchen workflow, menu pricing control, and daily customer accounts'}
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
                  <span>+ নতুন খাবার</span>
                </button>
              </div>

              {menuItems.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-slate-900/50 border border-slate-800 text-slate-400">
                  <Utensils className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>মেনুতে এখনও কোনো খাবার যুক্ত করা হয়নি।</p>
                  <button
                    onClick={() => setIsDishModalOpen(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs"
                  >
                    + প্রথম খাবার যুক্ত করুন
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
          )}

        </main>
      </div>

      {/* Add Dish Modal */}
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
