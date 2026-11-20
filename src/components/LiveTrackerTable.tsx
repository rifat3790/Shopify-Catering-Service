'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData } from '@/lib/types';
import LuxuryLoader from '@/components/LuxuryLoader';
import {
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit3,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Utensils
} from 'lucide-react';

interface LiveTrackerTableProps {
  orders: OrderData[];
  onOpenNewOrder: () => void;
  onSelectInvoice: (order: OrderData) => void;
  onUpdateStatus: (id: string, newStatus: OrderData['status']) => void;
  onDeleteOrder: (id: string) => void;
  isLoading?: boolean;
}

export default function LiveTrackerTable({
  orders,
  onOpenNewOrder,
  onSelectInvoice,
  onUpdateStatus,
  onDeleteOrder,
  isLoading,
}: LiveTrackerTableProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Due'>('All');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.itemsText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ? true : order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate totals from filtered or all
  const completedOrders = orders.filter((o) => o.status === 'Paid');
  const totalBillSum = orders.reduce((acc, o) => acc + (o.totalBill || 0), 0);
  const totalPaidSum = orders.reduce((acc, o) => acc + (o.paidAmount || 0), 0);
  const totalRefundSum = orders.reduce((acc, o) => {
    const diff = (o.paidAmount || 0) - (o.totalBill || 0);
    return diff > 0 ? acc + diff : acc;
  }, 0);
  const collectionRate =
    totalBillSum > 0 ? ((totalPaidSum / totalBillSum) * 100).toFixed(1) : '0.0';

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      'Order Number',
      'Customer',
      'Items',
      'Bill (BDT)',
      'Paid (BDT)',
      'Change/Refund (BDT)',
      'Status',
      'Date',
    ];
    const rows = orders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.customerName}"`,
      `"${o.itemsText}"`,
      o.totalBill,
      o.paidAmount,
      o.changeDue,
      `"${o.status}"`,
      `"${new Date(o.orderDate).toLocaleDateString()}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Shopify_Catering_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-emerald-900/50 rounded-2xl shadow-xl overflow-hidden">

      {/* Authentic Forest Green Luxury Header Banner */}
      <div className="bg-slate-50 dark:bg-slate-950 dark:bg-gradient-to-r dark:from-emerald-950/80 dark:via-slate-900 dark:to-emerald-950/60 px-5 sm:px-8 py-5 border-b border-slate-200 dark:border-emerald-800/80 text-slate-900 dark:text-white relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">🍽️</span>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-serif text-slate-900 dark:text-amber-200 tracking-wide flex items-center gap-2">
                Shopify Catering Service — Order & Payment Tracker
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-200/90 font-medium tracking-wide mt-0.5">
                {language === 'bn'
                  ? 'দৈনিক খাবার ও রিফ্রেশমেন্ট অর্ডার ট্র্যাকার - রিয়েল-টাইম বিল ও কালেকশন স্ট্যাটাস'
                  : 'Daily Food & Refreshment Order Tracker — Real-Time Bill & Collection Status'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-800/50 border border-emerald-300 dark:border-emerald-500/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              <span>Live MongoDB Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'গ্রাহক বা খাবারের নাম খুঁজুন...' : 'Search customer or food items...'}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
          />
        </div>

        {/* Status Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs gap-1">
            {(['All', 'Paid', 'Pending', 'Due'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${statusFilter === st
                  ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                {st === 'All' ? (language === 'bn' ? 'সকল' : 'All') : st}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all hover:scale-105 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
          </button>

          {/* Add Order Button */}
          <button
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{language === 'bn' ? 'অর্ডার যুক্ত করুন' : 'Add Order'}</span>
          </button>
        </div>
      </div>

      {/* Main Table Responsive Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[950px] text-left border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-100 dark:bg-emerald-950/70 border-b border-slate-200 dark:border-emerald-800/60 text-slate-700 dark:text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">
                {language === 'bn' ? 'গ্রাহকের নাম (Customer)' : 'Customer'}
              </th>
              <th className="py-3.5 px-4 sm:px-6">
                {language === 'bn' ? 'খাবারের বিবরণ (Ordered Items)' : 'Ordered Items'}
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-right">
                {language === 'bn' ? 'মোট বিল (Bill ৳)' : 'Bill (৳)'}
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-right">
                {language === 'bn' ? 'পরিশোধ (Paid ৳)' : 'Paid (৳)'}
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-right">
                {language === 'bn' ? 'ফেরত / বকেয়া (Change ৳)' : 'Change / Due (৳)'}
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-center">
                {language === 'bn' ? 'স্ট্যাটাস (Status)' : 'Status'}
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-right">
                {language === 'bn' ? 'অ্যাকশন' : 'Actions'}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12">
                  <LuxuryLoader message="Loading live orders..." subMessage="Synchronizing kitchen tracker" />
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Utensils className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                  <p>{language === 'bn' ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No catering orders found'}</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                // Highlight row for Ismail as in Google Sheet
                const isIsmail = order.customerName.toLowerCase().includes('ismail');
                const isPaid = order.status === 'Paid';
                const isDue = order.status === 'Due';
                const isPending = order.status === 'Pending';

                return (
                  <tr
                    key={order._id || order.orderNumber}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isIsmail ? 'bg-amber-500/5' : ''
                      }`}
                  >
                    {/* Customer Column */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            order.customerAvatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customerName || 'Customer')}&background=047857&color=fff`
                          }
                          alt={order.customerName}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customerName || 'Customer')}&background=047857&color=fff`;
                          }}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white tracking-wide flex items-center gap-1.5">
                            {order.customerName}
                            {isIsmail && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                                Special
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {order.orderNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Ordered Items Column */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="max-w-xs sm:max-w-md">
                        {order.itemsText && order.itemsText.trim() ? (
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {order.itemsText}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-xs">
                            {language === 'bn' ? 'অর্ডার পেন্ডিং / খালি' : 'No items selected'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Bill Column */}
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-amber-700 dark:text-amber-200">
                      ৳{Number(order.totalBill).toFixed(2)}
                    </td>

                    {/* Paid Column */}
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-emerald-700 dark:text-teal-300">
                      ৳{Number(order.paidAmount).toFixed(2)}
                    </td>

                    {/* Change / Due Column */}
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono">
                      {order.changeDue > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          ৳{Number(order.changeDue).toFixed(2)}
                        </span>
                      ) : order.changeDue < 0 ? (
                        <span className="text-rose-700 dark:text-rose-400 font-bold">
                          -৳{Math.abs(Number(order.changeDue)).toFixed(2)} (Due)
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          ৳0.00
                        </span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4 sm:px-6 text-center">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          onUpdateStatus(
                            order._id || order.orderNumber,
                            e.target.value as OrderData['status']
                          )
                        }
                        className={`text-xs font-bold py-1 px-3 rounded-full border outline-none cursor-pointer transition-colors ${isPaid
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/60 hover:bg-emerald-100'
                          : isPending
                            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-600/60 hover:bg-amber-100'
                            : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-600/60 hover:bg-rose-100'
                          }`}
                      >
                        <option value="Paid" className="bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400">Paid (পরিশোধ)</option>
                        <option value="Pending" className="bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400">Pending (অপেক্ষমাণ)</option>
                        <option value="Due" className="bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400">Due (বকেয়া)</option>
                        <option value="Partial" className="bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400">Partial</option>
                      </select>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onSelectInvoice(order)}
                          title="Print / View Invoice"
                          className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 border border-slate-200/60 dark:border-slate-700 transition-all hover:scale-105 shadow-xs"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteOrder(order._id || order.orderNumber)}
                          title="Delete Order"
                          className="p-2 rounded-xl bg-slate-100/80 hover:bg-rose-100/80 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/60 dark:border-slate-700 transition-all hover:scale-105 shadow-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Authentic Footer Summary Row matching Google Sheet */}
          <tfoot>
            <tr className="bg-slate-100/90 dark:bg-emerald-950/95 border-t-2 border-emerald-500 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              <td className="py-4 px-4 sm:px-6 text-slate-900 dark:text-amber-300 font-serif font-bold">
                {language === 'bn' ? 'সর্বমোট হিসাব (Total)' : 'Grand Total Summary'}
              </td>
              <td className="py-4 px-4 sm:px-6 text-slate-600 dark:text-emerald-200 font-medium">
                {completedOrders.length} {language === 'bn' ? 'টি সম্পন্ন অর্ডার' : 'Completed Orders'}
              </td>
              <td className="py-4 px-4 sm:px-6 text-right text-amber-700 dark:text-amber-300 font-mono text-base font-bold">
                ৳{totalBillSum.toFixed(2)}
              </td>
              <td className="py-4 px-4 sm:px-6 text-right text-emerald-700 dark:text-teal-300 font-mono text-base font-bold">
                ৳{totalPaidSum.toFixed(2)}
              </td>
              <td className="py-4 px-4 sm:px-6 text-right text-emerald-700 dark:text-emerald-400 font-mono text-base font-bold">
                ৳{totalRefundSum.toFixed(2)}
              </td>
              <td colSpan={2} className="py-4 px-4 sm:px-6 text-center text-slate-800 dark:text-amber-300 font-mono text-sm font-bold">
                {collectionRate}% {language === 'bn' ? 'আদায়কৃত' : 'Collected'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Notes & Legend */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {language === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid In Full'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            {language === 'bn' ? 'পেন্ডিং অর্ডার (Pending)' : 'Pending Order'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            {language === 'bn' ? 'বকেয়া (Due)' : 'Due / Unpaid'}
          </span>
        </div>
        <p className="italic text-slate-500">
          * {language === 'bn' ? 'নগদ জমা ও ফেরতযোগ্য টাকার নিখুঁত রিয়েল-টাইম হিসাব' : 'Exact real-time cash flow & change calculation'}
        </p>
      </div>
    </div>
  );
}

