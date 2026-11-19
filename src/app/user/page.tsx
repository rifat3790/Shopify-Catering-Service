'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import InvoiceModal from '@/components/InvoiceModal';
import QuickOrderModal from '@/components/QuickOrderModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, UserRecord } from '@/lib/types';
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
  MessageSquare 
} from 'lucide-react';

function UserDashboardContent() {
  const { user, refreshUser } = useAuth();
  const { language } = useLanguage();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Admin view switcher (only for super_admin and admin)
  const isElevated = user?.role === 'super_admin' || user?.role === 'admin';
  const [elevatedMemberList, setElevatedMemberList] = useState<UserRecord[]>([]);
  const [inspectedUserName, setInspectedUserName] = useState<string>('');

  const loadUserData = async () => {
    setLoading(true);
    try {
      const ordRes = await fetch('/api/orders');
      if (ordRes.ok) {
        const o = await ordRes.json();
        if (o.success && o.data) {
          setOrders(o.data);
        }
      }

      if (isElevated) {
        const uRes = await fetch('/api/users');
        if (uRes.ok) {
          const u = await uRes.json();
          if (u.success && u.data) {
            setElevatedMemberList(u.data);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  // Current active name to filter orders
  const activeDisplayName = inspectedUserName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const activeEmail = user?.email || '';

  // Filter orders strictly for this user
  const myOrders = orders.filter(o => {
    const cust = (o.customerName || '').toLowerCase().trim();
    const mail = (o.customerEmail || '').toLowerCase().trim();
    const targetName = activeDisplayName.toLowerCase().trim();
    const targetMail = activeEmail.toLowerCase().trim();

    return (
      cust.includes(targetName) || 
      (mail && targetMail && mail === targetMail) || 
      (cust && targetMail && targetMail.includes(cust))
    );
  });

  const displayBalance = user?.balance ?? 0;
  const displaySpent = user?.totalSpent ?? 0;
  const displayDue = user?.currentDue ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-[1920px] w-full mx-auto">
          
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-emerald-900/40">
            <div className="flex items-center gap-3">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=047857&color=fff`}
                alt={user?.displayName || 'User'}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/50 shadow-lg shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                    {user?.displayName || 'User'}&apos;s Catering Hub
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    {user?.department || 'Shopify Member'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' 
                    ? 'আপনার ব্যক্তিগত খাবার হিসাব, ওয়ালেট ব্যালেন্স ও রসিদ ডাউনলোড পোর্টাল'
                    : 'Personal catering account, dynamic wallet balance & instant invoice image download'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              {/* Only Super Admin & Admin can inspect other members */}
              {isElevated && elevatedMemberList.length > 0 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Inspect Member:</span>
                  <select
                    value={inspectedUserName}
                    onChange={e => setInspectedUserName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 focus:outline-none"
                  >
                    <option value="">My Own Account ({user?.displayName})</option>
                    {elevatedMemberList.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link
                href="/chat"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-600/50 font-semibold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Team & Voice Chat</span>
              </Link>

              <button
                onClick={() => { refreshUser(); loadUserData(); }}
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
              
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
                  ৳{displayBalance.toFixed(2)}
                </h2>
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
              <p className="text-[11px] text-slate-400 mt-2">
                {myOrders.length} {language === 'bn' ? 'টি সফল অর্ডার সম্পন্ন' : 'Orders completed'}
              </p>
            </div>

            {/* Unpaid / Due */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'bn' ? 'বকেয়া হিসাব (Current Due)' : 'Current Due / Credit'}
                </span>
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-mono text-teal-300">
                ৳{displayDue.toFixed(2)}
              </h2>
              <p className="text-[11px] text-teal-400 mt-2">
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

            <div className="p-4 sm:p-6 space-y-3">
              {loading ? (
                <LuxuryLoader message="Loading your personal orders..." subMessage="Fetching dynamic ledger" />
              ) : myOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>{language === 'bn' ? 'আপনার কোনো পূর্বের অর্ডার পাওয়া যায়নি।' : 'No previous orders found for this profile.'}</p>
                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs"
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
                        {order.itemsText || 'General Refreshment Order'}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {new Date(order.orderDate).toLocaleDateString()} • {order.paymentMethod}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">{language === 'bn' ? 'বিল' : 'Bill'}</p>
                        <p className="font-mono font-bold text-amber-300 text-sm">৳{Number(order.totalBill).toFixed(2)}</p>
                      </div>

                      {/* Order Image Download Button */}
                      <button
                        onClick={() => setSelectedInvoice(order)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'ইমেজ রসিদ' : 'Receipt Image'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </main>
      </div>

      <InvoiceModal
        order={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={async (data) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              customerName: user?.displayName || 'User',
              customerEmail: user?.email || '',
            }),
          });
          refreshUser();
          loadUserData();
        }}
      />
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
