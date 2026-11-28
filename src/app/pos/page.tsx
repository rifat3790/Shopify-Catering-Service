'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import InvoiceModal from '@/components/InvoiceModal';
import { LuxurySpinnerIcon } from '@/components/LuxuryLoader';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { MenuItemData, OrderData, UserRecord } from '@/lib/types';
import { getClientCache, setClientCache, clearClientCache } from '@/lib/clientCache';
import {
  Calculator,
  Trash2,
  Check,
  User,
  Banknote,
  Coins,
  ShoppingBag,
  RotateCcw,
  PlusSquare,
  ArrowRight
} from 'lucide-react';

const cashPresets = [20, 30, 50, 100, 200, 500, 1000];

function PosPageContent() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user: authUser, refreshUser } = useAuth();
  const [customer, setCustomer] = useState('Customer');
  const [members, setMembers] = useState<UserRecord[]>(() => {
    return getClientCache<UserRecord[]>('members_list') || [];
  });
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(() => {
    return getClientCache<MenuItemData[]>('menu_items') || [];
  });
  const [cart, setCart] = useState<{ [id: string]: { name: string; price: number; qty: number } }>({});
  const [tenderedCash, setTenderedCash] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Wallet'>('Cash');
  const [depositChangeToWallet, setDepositChangeToWallet] = useState<boolean>(true);
  const [savedOrder, setSavedOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic Custom item in POS
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/menu').then(r => r.json()),
      fetch('/api/users').then(r => r.json())
    ]).then(([mRes, uRes]) => {
      if (mRes.success && mRes.data) {
        setMenuItems(mRes.data);
        setClientCache('menu_items', mRes.data);
      }
      if (uRes.success && uRes.data) {
        setMembers(uRes.data);
        setClientCache('members_list', uRes.data);
        if (uRes.data.length > 0 && customer === 'Customer') setCustomer(uRes.data[0].name);
      }
    }).catch(err => console.warn(err));
  }, []);

  const totalBill = Object.values(cart).reduce((sum, item) => sum + item.price * item.qty, 0);
  const changeToReturn = tenderedCash >= totalBill ? tenderedCash - totalBill : 0;
  const dueAmount = totalBill > tenderedCash ? totalBill - tenderedCash : 0;
  const selectedMember = members.find(m => 
    m.name.toLowerCase() === customer.toLowerCase() || 
    m.email.toLowerCase() === customer.toLowerCase()
  );

  const handleAddItem = (id: string, name: string, price: number) => {
    setCart(prev => {
      const existing = prev[id];
      if (existing) {
        return { ...prev, [id]: { ...existing, qty: existing.qty + 1 } };
      }
      return { ...prev, [id]: { name, price, qty: 1 } };
    });
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[id]?.qty > 1) {
        next[id] = { ...next[id], qty: next[id].qty - 1 };
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim() || customItemPrice <= 0) return;
    handleAddItem(`ci-${Date.now()}`, customItemName.trim(), Number(customItemPrice));
    setCustomItemName('');
    setCustomItemPrice(0);
    setShowCustomInput(false);
  };

  const handleClearCart = () => {
    setCart({});
    setTenderedCash(0);
  };

  const handleCompleteOrder = async () => {
    if (!customer.trim()) {
      toast.warning(language === 'bn' ? 'গ্রাহকের নাম দিন' : 'Enter customer name', 'Name Required');
      return;
    }
    if (totalBill === 0) {
      toast.warning(language === 'bn' ? 'কমপক্ষে একটি খাবার নির্বাচন করুন' : 'Select at least one food item', 'Cart Empty');
      return;
    }

    const selectedMember = members.find(m => 
      m.name.toLowerCase() === customer.toLowerCase() || 
      m.email.toLowerCase() === customer.toLowerCase()
    );

    if (paymentMethod === 'Wallet') {
      if (!selectedMember) {
        toast.error(
          language === 'bn'
            ? 'ওয়ালেট পেমেন্টের জন্য একজন রেজিস্টার্ড মেম্বার নির্বাচন করুন।'
            : 'Wallet payment requires a registered member. Select a member or choose another payment method.',
          'Wallet Error'
        );
        return;
      }
      if ((selectedMember.balance || 0) < totalBill) {
        toast.error(
          language === 'bn'
            ? `অপর্যাপ্ত ওয়ালেট ব্যালেন্স! বর্তমান ব্যালেন্স: ৳${(selectedMember.balance || 0).toFixed(2)}`
            : `Insufficient wallet balance! Current balance: ৳${(selectedMember.balance || 0).toFixed(2)}`,
          'Wallet Error'
        );
        return;
      }
    }

    setLoading(true);
    try {
      const itemsText = Object.values(cart).map(i => `${i.qty} ta ${i.name.split('(')[0].trim()}`).join(' + ');
      const itemsList = Object.values(cart).map(i => ({
        name: i.name,
        quantity: i.qty,
        unitPrice: i.price,
        subtotal: i.qty * i.price
      }));

      const isWallet = paymentMethod === 'Wallet';
      const effectivePaid = isWallet ? totalBill : (tenderedCash > 0 ? tenderedCash : totalBill);
      const effectiveChange = isWallet ? 0 : (tenderedCash >= totalBill ? tenderedCash - totalBill : 0);
      const willDepositChange = Boolean(paymentMethod === 'Cash' && selectedMember && depositChangeToWallet && effectiveChange > 0);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: selectedMember?.name || customer,
          customerDepartment: selectedMember?.department || 'Shopify Team',
          customerEmail: selectedMember?.email || '',
          customerAvatar: selectedMember?.avatar || '',
          userId: selectedMember?.id || '',
          itemsText,
          items: itemsList,
          totalBill,
          paidAmount: effectivePaid,
          changeDue: effectiveChange,
          status: (isWallet || tenderedCash >= totalBill) ? 'Paid' : 'Due',
          paymentMethod,
          depositChangeToWallet: willDepositChange,
        })
      });

      const json = await res.json();
      if (json.success) {
        setSavedOrder(json.data);
        handleClearCart();
        clearClientCache('orders_list');
        clearClientCache('members_list');

        if (refreshUser) {
          await refreshUser().catch(() => {});
        }
        try {
          const uRes = await fetch('/api/users').then(r => r.json());
          if (uRes?.success && Array.isArray(uRes.data)) {
            setMembers(uRes.data);
            setClientCache('members_list', uRes.data);
          }
        } catch {}

        const balanceBonusText = willDepositChange
          ? (language === 'bn'
              ? ` • অবশিষ্ট ৳${effectiveChange.toFixed(2)} ওয়ালেটে জমা হয়েছে!`
              : ` • ৳${effectiveChange.toFixed(2)} credited to wallet!`)
          : '';

        toast.success(
          language === 'bn'
            ? `অর্ডার #${json.data.orderNumber} সফলভাবে গ্রহণ করা হয়েছে!${balanceBonusText}`
            : `Order #${json.data.orderNumber} created successfully!${balanceBonusText}`,
          willDepositChange ? 'Order Completed • Wallet Credited 💰' : 'Order Completed 🎉'
        );
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing order', 'Order Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100">
      <Sidebar />

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-emerald-900/40">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-6 h-6 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="truncate">{language === 'bn' ? 'কাউন্টার পিওএস এক্সপ্রেস (Counter POS)' : 'Counter POS Express'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'bn' ? 'দ্রুত ক্যাশ গ্রহণ, খাবার সিলেক্ট ও স্বয়ংক্রিয় বাকি/ফেরত ক্যালকুলেটর' : 'Rapid item tapping, instant cash tender calculation, and receipt generation'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200/80 dark:border-amber-500/40 text-xs font-semibold transition-all shadow-xs"
            >
              <PlusSquare className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'কাস্টম আইটেম' : 'Custom Item'}</span>
            </button>

            <button
              onClick={handleClearCart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800 text-xs transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ক্লিয়ার' : 'Clear'}</span>
            </button>
          </div>
        </div>

        {/* Custom Item Form */}
        {showCustomInput && (
          <form onSubmit={handleAddCustom} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-amber-500/40 shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">New Custom Dish:</span>
            <input
              type="text"
              required
              value={customItemName}
              onChange={e => setCustomItemName(e.target.value)}
              placeholder="Dish Name (e.g. Special Beef Curry)"
              className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
            />
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-xs text-amber-600 dark:text-amber-400 font-bold font-mono select-none">৳</span>
              <input
                type="number"
                required
                min="1"
                value={customItemPrice || ''}
                onChange={e => setCustomItemPrice(Number(e.target.value))}
                placeholder="Price"
                className="w-24 pl-6 pr-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold text-xs shadow-xs hover:scale-105 transition-all">
              Add to Register
            </button>
          </form>
        )}

        {/* POS Grid: Left Items / Right Register */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Customer & Item Tap Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* Customer Pill Selectors */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{language === 'bn' ? 'গ্রাহক সিলেক্ট করুন' : 'Select Customer'}</span>
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{customer}</span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {members.length > 0 ? (
                  members.map((m) => {
                    const isSelected = customer === m.name;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCustomer(m.name)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white shadow-sm ring-2 ring-amber-400/60'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs'
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold leading-none ${
                          isSelected 
                            ? 'bg-black/20 text-white border border-white/25' 
                            : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                        }`}>
                          ৳{(m.balance || 0).toFixed(0)}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <input
                    type="text"
                    value={customer}
                    onChange={e => setCustomer(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </div>

            {/* Tap Items Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {language === 'bn' ? 'আইটেমে ট্যাপ করে যুক্ত করুন' : 'Tap Food Item to Add to Order'}
              </h3>

              {menuItems.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs space-y-3 shadow-xs">
                  <p>{language === 'bn' ? 'মেনুতে কোনো খাবার নেই। উপরে "+ কাস্টম আইটেম" দিয়ে খাবার যুক্ত করুন।' : 'No menu dishes found yet.'}</p>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-500 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 hover:scale-105 transition-all"
                  >
                    <PlusSquare className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '+ কাস্টম আইটেম যোগ করুন' : '+ Add Custom Dish'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {menuItems.map((item) => (
                    <button
                      key={item._id || item.name}
                      onClick={() => handleAddItem(item._id || item.name, item.name, item.price)}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/80 text-left transition-all active:scale-95 group flex flex-col justify-between h-28 relative overflow-hidden shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 leading-snug line-clamp-2">
                          {language === 'bn' ? item.nameBn : item.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                          ৳{item.price}
                        </span>
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-950 text-emerald-700 hover:text-white dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-center text-xs font-bold transition-colors">
                          +
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Register Bill, Cash Presets & Change Return (5 cols) */}
          <div className="lg:col-span-5 space-y-4">

            <div id="pos-register-card" className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-emerald-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl space-y-4">

              {/* Register Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      <span>{customer}&apos;s Order</span>
                      {selectedMember && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Wallet: ৳{(selectedMember.balance || 0).toFixed(2)}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedMember?.department || 'Shopify Team'} • Catering POS
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {Object.values(cart).length} items
                </span>
              </div>

              {/* Order Items Table in Register */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {Object.keys(cart).length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400 italic">
                    {language === 'bn' ? 'কোনো খাবার যোগ করা হয়নি' : 'Cart is empty. Tap items on the left.'}
                  </p>
                ) : (
                  Object.entries(cart).map(([id, item]) => (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex-1 mr-2 truncate">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-300 font-mono font-bold">
                          {item.qty} × ৳{item.price} = ৳{item.qty * item.price}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemoveItem(id)}
                          className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-slate-800 dark:text-white font-mono">{item.qty}</span>
                        <button
                          onClick={() => handleAddItem(id, item.name, item.price)}
                          className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold hover:bg-emerald-500"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill & Payment Presets */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-emerald-950 space-y-3">

                {/* Total Bill Row */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {language === 'bn' ? 'মোট বিল (Total Bill):' : 'Total Bill:'}
                  </span>
                  <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">
                    ৳{totalBill.toFixed(2)}
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">
                    {language === 'bn' ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Cash', 'Wallet', 'bKash', 'Nagad'] as const).map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method);
                            if (method === 'Wallet') {
                              setTenderedCash(totalBill);
                            }
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white shadow-sm ring-2 ring-amber-400/60'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          {method === 'Cash' ? (language === 'bn' ? 'ক্যাশ' : 'Cash')
                            : method === 'Wallet' ? (language === 'bn' ? 'ওয়ালেট' : 'Wallet')
                            : method}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wallet Balance Display when Wallet Selected */}
                {paymentMethod === 'Wallet' && (
                  <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                    selectedMember && (selectedMember.balance || 0) >= totalBill
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {language === 'bn' ? 'কাস্টমার ওয়ালেট ব্যালেন্স:' : 'Available Wallet Balance:'}
                    </span>
                    <span className="font-mono font-bold text-sm">৳{(selectedMember?.balance || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Cash Tender Presets & Input (When Cash Selected) */}
                {paymentMethod === 'Cash' && (
                  <>
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-medium flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {language === 'bn' ? 'গ্রাহক কত টাকার নোট দিয়েছেন?' : 'Cash Handed by Customer:'}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {cashPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTenderedCash(preset)}
                            className={`py-2 rounded-xl font-mono text-xs font-bold transition-all shadow-xs ${tenderedCash === preset
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300 scale-105'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                              }`}
                          >
                            ৳{preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setTenderedCash(totalBill)}
                          className="py-2 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-all shadow-xs"
                        >
                          Exact (সমান)
                        </button>
                      </div>
                    </div>

                    {/* Tendered Input */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{language === 'bn' ? 'জমা পরিমাণ:' : 'Cash Tendered:'}</span>
                      <input
                        type="number"
                        value={tenderedCash || ''}
                        onChange={(e) => setTenderedCash(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-right text-emerald-700 dark:text-teal-300 text-sm focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-xs"
                      />
                    </div>

                    {/* Change or Due Result Box */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${dueAmount > 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-300'
                      }`}>
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        <span className="text-xs font-semibold">
                          {dueAmount > 0
                            ? (language === 'bn' ? 'বকেয়া রয়েছে (Due):' : 'Due Amount:')
                            : (language === 'bn' ? 'গ্রাহককে ফেরত দিন (Change):' : 'Change to Return:')}
                        </span>
                      </div>
                      <span className="text-lg font-mono font-bold">
                        ৳{dueAmount > 0 ? dueAmount.toFixed(2) : changeToReturn.toFixed(2)}
                      </span>
                    </div>

                    {/* Credit Change to Member Wallet Toggle */}
                    {dueAmount === 0 && changeToReturn > 0 && selectedMember && (
                      <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900 dark:bg-gradient-to-r dark:from-emerald-950/60 dark:via-slate-900 dark:to-amber-950/40 border border-slate-200/80 dark:border-amber-500/40 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={depositChangeToWallet}
                            onChange={(e) => setDepositChangeToWallet(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                          <span className="text-slate-700 dark:text-amber-200 font-medium">
                            {language === 'bn'
                              ? `অবশিষ্ট ৳${changeToReturn.toFixed(2)} ক্যাটারিং ওয়ালেটে জমা করুন`
                              : `Credit change ৳${changeToReturn.toFixed(2)} to Customer Wallet`}
                          </span>
                        </label>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                          depositChangeToWallet
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {depositChangeToWallet 
                            ? `+৳${changeToReturn.toFixed(2)} Wallet` 
                            : (language === 'bn' ? 'নগদ ফেরত' : 'Cash Back')}
                        </span>
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* Complete & Print Button */}
              <button
                onClick={handleCompleteOrder}
                disabled={loading || totalBill === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-sm shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LuxurySpinnerIcon size="xs" />
                    <span>Saving Order & Printing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{language === 'bn' ? 'অর্ডার সম্পন্ন করুন ও রসিদ তৈরি' : 'Complete Order & Print'}</span>
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

        {/* Mobile Sticky Bottom Checkout Bar (lg:hidden) */}
        {totalBill > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-slate-950/95 backdrop-blur-xl border-t border-emerald-500/40 z-30 flex items-center justify-between gap-3 shadow-2xl">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">
                {Object.values(cart).reduce((a, b) => a + b.qty, 0)} items in Cart
              </span>
              <span className="font-mono font-bold text-amber-300 text-base">৳{totalBill.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                const registerEl = document.getElementById('pos-register-card');
                registerEl?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all"
            >
              <span>{language === 'bn' ? 'বিল ও পেমেন্ট দেখুন' : 'Review & Pay'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      <InvoiceModal
        order={savedOrder}
        onClose={() => setSavedOrder(null)}
      />
    </div>
  );
}

export default function PosPage() {
  return (
    <AuthGuard>
      <PosPageContent />
    </AuthGuard>
  );
}
