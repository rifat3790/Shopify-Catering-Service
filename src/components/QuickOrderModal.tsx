'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { OrderData, MenuItemData } from '@/lib/types';
import { getClientCache, setClientCache } from '@/lib/clientCache';
import {
  X,
  Plus,
  Minus,
  Banknote,
  Check,
  Sparkles,
  User,
  PlusSquare,
  Trash2,
  Lock,
  AlertCircle
} from 'lucide-react';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: Partial<OrderData>) => Promise<void>;
  prefillCustomer?: string;
}

const cashPresets = [20, 30, 50, 100, 200, 500, 1000];

interface CustomItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function QuickOrderModal({
  isOpen,
  onClose,
  onSubmit,
  prefillCustomer,
}: QuickOrderModalProps) {
  const { user, refreshUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState(prefillCustomer || user?.displayName || user?.name || '');
  const [customerAvatar, setCustomerAvatar] = useState(user?.photoURL || user?.avatar || '');
  const [department, setDepartment] = useState('Shopify Team');
  const [allMembers, setAllMembers] = useState<any[]>(() => {
    return getClientCache<any[]>('members_list') || [];
  });
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(() => {
    return getClientCache<MenuItemData[]>('menu_items') || [];
  });
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState<number>(0);
  const [newCustomQty, setNewCustomQty] = useState<number>(1);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Wallet' | 'Card'>('Cash');
  const [depositChangeToWallet, setDepositChangeToWallet] = useState<boolean>(true);
  const [liveBalance, setLiveBalance] = useState<number>(user?.balance || 0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderControl, setOrderControl] = useState<{
    ordersEnabled: boolean;
    dailyCutoffTime: string;
    cutoffEnabled: boolean;
    isOrderAllowedNow: boolean;
    evaluation?: any;
  } | null>(null);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isOrderAllowedForMe = isSuperOrAdmin || (orderControl ? orderControl.isOrderAllowedNow : true);

  useEffect(() => {
    if (isOpen) {
      if (prefillCustomer) {
        setCustomerName(prefillCustomer);
      } else if (user?.displayName || user?.name || user?.email) {
        setCustomerName(user.displayName || user.name || user.email?.split('@')[0] || '');
        setCustomerAvatar(user.photoURL || user.avatar || '');
      }

      setLiveBalance(user?.balance || 0);

      // Fetch fresh members & live balance from database
      fetch('/api/users')
        .then(r => r.json())
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setAllMembers(res.data);
            setClientCache('members_list', res.data);
            if (prefillCustomer) {
              const target = res.data.find((u: any) =>
                u.name?.toLowerCase() === prefillCustomer.toLowerCase() ||
                u.id === prefillCustomer ||
                u.email?.toLowerCase() === prefillCustomer.toLowerCase()
              );
              if (target) {
                setCustomerName(target.name);
                if (target.department) setDepartment(target.department);
                if (target.avatar) setCustomerAvatar(target.avatar);
                if (target.balance !== undefined) setLiveBalance(Number(target.balance) || 0);
              }
            } else {
              const found = res.data.find((u: any) =>
                u.email?.toLowerCase() === (user?.email || '').toLowerCase() ||
                u.id === user?.uid
              );
              if (found) {
                if (found.balance !== undefined) setLiveBalance(Number(found.balance) || 0);
                if (found.department) setDepartment(found.department);
                if (found.avatar) setCustomerAvatar(found.avatar);
              }
            }
          }
        })
        .catch(() => { });

      fetch('/api/menu')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data && data.data.length > 0) {
            setMenuItems(data.data);
            setClientCache('menu_items', data.data);
          }
        })
        .catch(() => { });

      // Fetch order control status & cutoff timing
      fetch('/api/settings/orders')
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setOrderControl(res.data);
          }
        })
        .catch(() => { });
    }
  }, [isOpen, prefillCustomer, user]);

  if (!isOpen) return null;

  // Calculate bill
  let calculatedBill = 0;
  const selectedItemsSummary: string[] = [];
  const itemsList: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }> = [];

  // 1. Presets from dynamic menuItems
  menuItems.forEach((item) => {
    const qty = itemQuantities[item._id || item.name] || 0;
    if (qty > 0) {
      const sub = qty * item.price;
      calculatedBill += sub;
      selectedItemsSummary.push(`${qty}x ${item.name.split(' ')[0]}`);
      itemsList.push({
        name: item.name,
        quantity: qty,
        unitPrice: item.price,
        subtotal: sub,
      });
    }
  });

  // 2. Dynamic Custom Items
  customItems.forEach((ci) => {
    if (ci.qty > 0 && ci.price > 0) {
      const sub = ci.qty * ci.price;
      calculatedBill += sub;
      selectedItemsSummary.push(`${ci.qty}x ${ci.name}`);
      itemsList.push({
        name: ci.name,
        quantity: ci.qty,
        unitPrice: ci.price,
        subtotal: sub,
      });
    }
  });

  const changeDue = paidAmount > 0 ? paidAmount - calculatedBill : 0;

  const handleItemCount = (id: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleSetItemCount = (id: string, count: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, count),
    }));
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim() || newCustomPrice <= 0) return;

    setCustomItems(prev => [
      ...prev,
      {
        id: `ci-${Date.now()}`,
        name: newCustomName.trim(),
        price: Number(newCustomPrice),
        qty: Math.max(1, Number(newCustomQty) || 1)
      }
    ]);
    setNewCustomName('');
    setNewCustomPrice(0);
    setNewCustomQty(1);
    setShowAddCustom(false);
  };

  const handleCustomItemQty = (id: string, delta: number) => {
    setCustomItems(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, qty: Math.max(1, c.qty + delta) };
      }
      return c;
    }));
  };

  const handleSetCustomItemQty = (id: string, qty: number) => {
    setCustomItems(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, qty: Math.max(1, qty) };
      }
      return c;
    }));
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOrderAllowedForMe) {
      toast.warning(
        orderControl?.evaluation?.messageBn || (language === 'bn' ? 'আজকের খাবার অর্ডারের নির্ধারিত সময় শেষ হয়ে গেছে।' : 'Daily order cutoff has passed.'),
        language === 'bn' ? 'অর্ডার গ্রহণ বন্ধ' : 'Orders Closed'
      );
      return;
    }

    const finalCust = customerName.trim() || prefillCustomer || user?.displayName || user?.name || user?.email?.split('@')[0] || 'Member';
    const finalAvatar = customerAvatar || user?.photoURL || user?.avatar || '';

    // If user filled in custom dish inputs but didn't click "Add", automatically include it
    const effectiveItemsList = [...itemsList];
    let effectiveBill = calculatedBill;
    const effectiveSummary = [...selectedItemsSummary];

    if (newCustomName.trim() && newCustomPrice > 0) {
      const extraQty = Math.max(1, Number(newCustomQty) || 1);
      const extraSub = extraQty * Number(newCustomPrice);
      effectiveBill += extraSub;
      effectiveSummary.push(`${extraQty}x ${newCustomName.trim()}`);
      effectiveItemsList.push({
        name: newCustomName.trim(),
        quantity: extraQty,
        unitPrice: Number(newCustomPrice),
        subtotal: extraSub,
      });
    }

    if (effectiveItemsList.length === 0 && effectiveBill === 0) {
      toast.warning(
        language === 'bn'
          ? 'দয়া করে অন্তত একটি খাবারের আইটেম বা কাস্টম খাবার যোগ করুন!'
          : 'Please select at least one menu item or add a custom dish!',
        language === 'bn' ? 'খাবার নির্বাচন করুন' : 'Item Required'
      );
      return;
    }

    const effectivePaid = Number(paidAmount) || (paymentMethod === 'Wallet' ? effectiveBill : 0);
    const effChange = paymentMethod === 'Wallet' ? 0 : Math.max(0, effectivePaid - effectiveBill);
    const willDepositChange = Boolean(paymentMethod === 'Cash' && depositChangeToWallet && effChange > 0);

    setSubmitting(true);
    try {
      await onSubmit({
        customerName: finalCust,
        customerAvatar: finalAvatar,
        customerEmail: user?.email || '',
        userId: user?.uid || '',
        customerDepartment: department,
        itemsText: effectiveSummary.join(' + ') || (language === 'bn' ? 'ক্যাটারিং খাবার অর্ডার' : 'Catering Order'),
        items: effectiveItemsList,
        totalBill: effectiveBill,
        paidAmount: effectivePaid,
        changeDue: effChange,
        status: effectiveBill > 0 && (effectivePaid >= effectiveBill || paymentMethod === 'Wallet') ? 'Paid' : (effectiveBill === 0 ? 'Pending' : 'Due'),
        paymentMethod,
        depositChangeToWallet: willDepositChange,
        notes,
      });

      const changeMsg = willDepositChange
        ? (language === 'bn' ? ` (বাকি ৳${effChange.toFixed(2)} ওয়ালেট ব্যালেন্সে জমা হয়েছে)` : ` (৳${effChange.toFixed(2)} change deposited to wallet)`)
        : '';

      toast.success(
        language === 'bn'
          ? `আপনার খাবার অর্ডার সফলভাবে গ্রহণ করা হয়েছে! মোট বিল: ৳${effectiveBill.toFixed(2)}${changeMsg}`
          : `Order placed successfully! Total Bill: ৳${effectiveBill.toFixed(2)}${changeMsg}`,
        'Order Confirmed 🎉'
      );

      // Refresh live user balance across app
      if (refreshUser) {
        refreshUser().catch(() => { });
      }

      // reset
      setItemQuantities({});
      setCustomItems([]);
      setNewCustomName('');
      setNewCustomPrice(0);
      setPaidAmount(0);
      setCustomerName(user?.displayName || user?.name || '');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order', 'Order Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 px-6 py-4 border-b border-emerald-800/80 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-amber-200">
                {language === 'bn' ? 'নতুন খাবার ও রিফ্রেশমেন্ট অর্ডার' : 'New Catering & Refreshment Order'}
              </h3>
              <p className="text-xs text-emerald-300">
                {language === 'bn' ? 'মেনু আইটেম নির্বাচন বা কাস্টম খাবার যোগ করুন' : 'Select menu items or add custom dishes dynamically'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">

          {/* Order Cutoff Status Banner */}
          {!isOrderAllowedForMe && orderControl && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold">{language === 'bn' ? 'অর্ডার গ্রহণ বন্ধ রয়েছে' : 'Orders Closed'}</p>
                <p className="text-[11px] text-rose-300/80">
                  {orderControl.evaluation?.messageBn || (language === 'bn' ? 'আজকের খাবার অর্ডারের নির্ধারিত সময় শেষ হয়ে গেছে।' : 'Daily order cutoff has passed.')}
                </p>
              </div>
            </div>
          )}

          {isSuperOrAdmin && orderControl && !orderControl.isOrderAllowedNow && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {language === 'bn'
                  ? '⚡ অ্যাডমিন ওভাররাইড: সাধারণ ইউজারদের অর্ডার বন্ধ থাকলেও আপনি অ্যাডমিন হিসেবে অর্ডার করতে পারবেন।'
                  : '⚡ Admin Override: You can place orders as an administrator.'}
              </span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {language === 'bn' ? 'গ্রাহক বা মেম্বার নাম *' : 'Customer / Team Member Name *'}
              </label>
              {user && (
                <span className="text-[10px] text-emerald-400 font-medium">
                  {language === 'bn' ? 'প্রোফাইল থেকে স্বয়ংক্রিয়' : 'Auto-synced from Profile'}
                </span>
              )}
            </div>

            {user && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={customerAvatar || user.photoURL || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName || 'User')}&background=047857&color=fff`}
                    alt="Profile"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName || 'User')}&background=047857&color=fff`;
                    }}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{customerName || user.displayName || 'Member'}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                        Profile Active
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-emerald-700/50">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase block">
                    {language === 'bn' ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-amber-300">
                    ৳{(liveBalance ?? user.balance ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                list="quickorder-members-datalist"
                value={customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerName(val);
                  const match = allMembers.find((u: any) => u.name?.toLowerCase() === val.toLowerCase());
                  if (match) {
                    if (match.department) setDepartment(match.department);
                    if (match.avatar) setCustomerAvatar(match.avatar);
                    if (match.balance !== undefined) setLiveBalance(Number(match.balance) || 0);
                  }
                }}
                placeholder={language === 'bn' ? 'গ্রাহকের নাম লিখুন' : 'Enter customer name'}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <datalist id="quickorder-members-datalist">
                {allMembers.map((m: any) => (
                  <option key={m.id} value={m.name}>
                    {m.department} (৳{m.balance})
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Quick Menu Items Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {language === 'bn' ? 'খাবারের আইটেম নির্বাচন (Menu Items)' : 'Select Food Items'}
              </label>

              {/* Button to toggle Dynamic Custom Item Form */}
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1"
              >
                <PlusSquare className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'কাস্টম আইটেম' : 'Custom Item'}</span>
              </button>
            </div>

            {/* Dynamic Custom Item Creator */}
            {showAddCustom && (
              <div className="mb-3 p-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                <p className="text-[11px] font-bold text-amber-300">
                  {language === 'bn' ? 'নতুন কাস্টম খাবার যোগ করুন:' : 'Add Custom Dish / Refreshment:'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newCustomName}
                    onChange={e => setNewCustomName(e.target.value)}
                    placeholder={language === 'bn' ? 'খাবারের নাম' : 'Item name'}
                    className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newCustomPrice || ''}
                    onChange={e => setNewCustomPrice(Number(e.target.value))}
                    placeholder="৳ Price"
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-300"
                  />
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-slate-400">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={newCustomQty}
                      onChange={e => setNewCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    যোগ করুন
                  </button>
                </div>
              </div>
            )}

            {/* Render Custom Items Added */}
            {customItems.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {customItems.map((ci) => (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">✨ {ci.name}</span>
                      <span className="text-[11px] text-amber-300 font-mono ml-2">৳{ci.price} each</span>
                      <span className="text-[11px] text-emerald-400 font-mono font-bold ml-2">Total: ৳{(ci.qty * ci.price).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleCustomItemQty(ci.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={ci.qty}
                          onChange={(e) => handleSetCustomItemQty(ci.id, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-10 text-center bg-transparent text-xs font-mono font-bold text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCustomItemQty(ci.id, 1)}
                          className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(ci.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dynamic Catalog Grid */}
            {menuItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                মেনুতে কোনো খাবার নেই। উপরে &quot;+ কাস্টম আইটেম&quot; দিয়ে খাবার যুক্ত করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {menuItems.map((item) => {
                  const count = itemQuantities[item._id || item.name] || 0;
                  return (
                    <div
                      key={item._id || item.name}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${count > 0
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-amber-300 font-mono">৳{item.price}</span>
                          {count > 0 && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">
                              = ৳{(count * item.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleItemCount(item._id || item.name, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={count === 0 ? '' : count}
                          onChange={(e) => handleSetItemCount(item._id || item.name, Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-12 h-7 text-center bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg text-xs font-mono font-bold text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemCount(item._id || item.name, 1)}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Calculation Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/60 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 font-medium">
                {language === 'bn' ? 'মোট বিল (Total Bill):' : 'Total Calculated Bill:'}
              </span>
              <span className="text-xl font-bold font-mono text-amber-300">
                ৳{calculatedBill.toFixed(2)}
              </span>
            </div>

            {/* Cash Presets */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'bn' ? 'নগদ জমা নোট সিলেক্টর:' : 'Cash Tender Presets:'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cashPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setPaidAmount(preset)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${paidAmount === preset
                      ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                      }`}
                  >
                    ৳{preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPaidAmount(calculatedBill)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                >
                  Exact (সমান)
                </button>
              </div>
            </div>

            {/* Custom Paid Input & Change */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {language === 'bn' ? 'পরিশোধিত টাকা (Paid ৳)' : 'Paid Amount (৳)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-teal-300 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {language === 'bn' ? 'ফেরতযোগ্য বাকি (Change ৳)' : 'Change to Return (৳)'}
                </label>
                <div className={`px-3 py-2 rounded-xl text-sm font-mono font-bold border ${changeDue >= 0
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                  : 'bg-rose-950/40 text-rose-400 border-rose-800'
                  }`}>
                  ৳{changeDue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Change to Wallet Balance Option */}
            {paymentMethod === 'Cash' && changeDue > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={depositChangeToWallet}
                    onChange={(e) => setDepositChangeToWallet(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="text-amber-200 font-medium">
                    {language === 'bn'
                      ? `অবশিষ্ট ৳${changeDue.toFixed(2)} ক্যাটারিং ব্যালেন্সে জমা করুন`
                      : `Credit change ৳${changeDue.toFixed(2)} to Catering Wallet`}
                  </span>
                </label>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {depositChangeToWallet ? `+৳${changeDue.toFixed(2)} Balance` : (language === 'bn' ? 'নগদ ফেরত' : 'Cash Back')}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method & Notes */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const m = e.target.value as any;
                    setPaymentMethod(m);
                    if (m === 'Wallet') {
                      setPaidAmount(calculatedBill);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="Wallet">Catering Wallet (ব্যালেন্স থেকে কর্তন)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ মোবাইল)</option>
                  <option value="Card">Card (কার্ড)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === 'bn' ? 'অর্ডার নোট' : 'Order Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. less spicy, extra chutney"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {paymentMethod === 'Wallet' && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">
                      {language === 'bn' ? 'বর্তমান ওয়ালেট ব্যালেন্স:' : 'Current Wallet Balance:'}
                    </span>
                    <span className="font-mono font-bold text-amber-300">৳{(liveBalance ?? user?.balance ?? 0).toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {calculatedBill <= (liveBalance ?? user?.balance ?? 0)
                      ? (language === 'bn' ? '✓ ব্যালেন্স পর্যাপ্ত' : '✓ Sufficient Balance')
                      : (language === 'bn' ? '⚠️ নেগেটিভ/ডিউ হবে' : '⚠️ Overdraft / Due')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-800/40 text-[11px] text-slate-300">
                  <span>{language === 'bn' ? 'অর্ডার পরবর্তী ব্যালেন্স:' : 'Balance After Order:'}</span>
                  <span className="font-mono font-bold text-teal-300">
                    ৳{Math.max(0, (liveBalance ?? user?.balance ?? 0) - calculatedBill).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !isOrderAllowedForMe}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${isOrderAllowedForMe
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-800 border border-rose-500/50 text-rose-300 opacity-60 cursor-not-allowed'
                }`}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Saving...</span>
                </>
              ) : !isOrderAllowedForMe ? (
                <>
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>{language === 'bn' ? 'অর্ডার গ্রহণ বন্ধ (সময় শেষ)' : 'Orders Closed'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'bn' ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
