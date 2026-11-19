'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData, initialMenuItems, MenuItemData } from '@/lib/types';
import { 
  X, 
  Plus, 
  Minus, 
  Banknote, 
  Check, 
  Sparkles, 
  User, 
  UtensilsCrossed,
  PlusSquare,
  Trash2
} from 'lucide-react';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: Partial<OrderData>) => Promise<void>;
  prefillCustomer?: string;
}

const regularCustomers = [
  "Shamim",
  "Ismail",
  "Shagor",
  "Muhaimenul",
  "Azim",
  "Refayet",
  "Muzahid",
];

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
  const { language } = useLanguage();
  const [customerName, setCustomerName] = useState(prefillCustomer || '');
  const [department, setDepartment] = useState('Shopify Team');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState<number>(0);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Wallet' | 'Card'>('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate bill
  let calculatedBill = 0;
  const selectedItemsSummary: string[] = [];
  const itemsList: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }> = [];

  // 1. Presets from initialMenuItems
  initialMenuItems.forEach((item) => {
    const qty = itemQuantities[item._id || item.name] || 0;
    if (qty > 0) {
      const sub = qty * item.price;
      calculatedBill += sub;
      selectedItemsSummary.push(`${qty} ta ${item.name.split(' ')[0]}`);
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
      selectedItemsSummary.push(`${ci.qty} ta ${ci.name}`);
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

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim() || newCustomPrice <= 0) return;

    setCustomItems(prev => [
      ...prev,
      {
        id: `ci-${Date.now()}`,
        name: newCustomName.trim(),
        price: Number(newCustomPrice),
        qty: 1
      }
    ]);
    setNewCustomName('');
    setNewCustomPrice(0);
    setShowAddCustom(false);
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCust = customerName.trim() || prefillCustomer || 'Shamim';

    setSubmitting(true);
    try {
      await onSubmit({
        customerName: finalCust,
        customerDepartment: department,
        itemsText: selectedItemsSummary.join(' + ') || (language === 'bn' ? 'সাধারণ ক্যাটারিং অর্ডার' : 'General Catering Order'),
        items: itemsList,
        totalBill: calculatedBill,
        paidAmount: Number(paidAmount) || 0,
        changeDue: (Number(paidAmount) || 0) - calculatedBill,
        status: calculatedBill > 0 && paidAmount >= calculatedBill ? 'Paid' : (calculatedBill === 0 ? 'Pending' : 'Due'),
        paymentMethod,
        notes,
      });
      // reset
      setItemQuantities({});
      setCustomItems([]);
      setPaidAmount(0);
      setCustomerName('');
      onClose();
    } catch (err: any) {
      alert('Failed: ' + err.message);
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
          
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {language === 'bn' ? 'গ্রাহক বা মেম্বার নির্বাচন করুন *' : 'Select Team Member or Enter Name *'}
            </label>
            
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {regularCustomers.map((cust) => (
                <button
                  type="button"
                  key={cust}
                  onClick={() => setCustomerName(cust)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    customerName === cust
                      ? 'bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  {cust}
                </button>
              ))}
            </div>

            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={language === 'bn' ? 'উদাঃ Shamim, Shagor, বা নতুন নাম' : 'e.g. Shamim, Shagor, or custom name'}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
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
                <span>{language === 'bn' ? '+ কাস্টম আইটেম' : '+ Custom Item'}</span>
              </button>
            </div>

            {/* Dynamic Custom Item Creator */}
            {showAddCustom && (
              <div className="mb-3 p-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                <p className="text-[11px] font-bold text-amber-300">
                  {language === 'bn' ? 'নতুন কাস্টম খাবার যোগ করুন:' : 'Add Custom Dish / Refreshment:'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCustomName}
                    onChange={e => setNewCustomName(e.target.value)}
                    placeholder={language === 'bn' ? 'খাবারের নাম (যেমনঃ স্পেশাল পুডিং)' : 'Item name (e.g. Egg Pudding)'}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="number"
                    value={newCustomPrice || ''}
                    onChange={e => setNewCustomPrice(Number(e.target.value))}
                    placeholder="৳ Price"
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-300"
                  />
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
                    <span className="font-semibold text-white">✨ {ci.name} (৳{ci.price})</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300">Qty: {ci.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(ci.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Standard Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {initialMenuItems.map((item) => {
                const count = itemQuantities[item._id || item.name] || 0;
                return (
                  <div
                    key={item._id || item.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      count > 0
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                      <p className="text-[11px] text-amber-300 font-mono">৳{item.price}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemCount(item._id || item.name, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">
                        {count}
                      </span>
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
                    className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
                      paidAmount === preset
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
                <div className={`px-3 py-2 rounded-xl text-sm font-mono font-bold border ${
                  changeDue >= 0
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950/40 text-rose-400 border-rose-800'
                }`}>
                  ৳{changeDue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
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
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'সংরক্ষণ হচ্ছে...' : (language === 'bn' ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
