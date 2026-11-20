'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  ShoppingBag, 
  Receipt, 
  Wallet, 
  Coins, 
  TrendingUp 
} from 'lucide-react';

interface MetricsProps {
  stats: {
    ordersCount: number;
    completedOrdersCount?: number;
    totalBill: number;
    totalPaid: number;
    totalRefundChange: number;
    totalDue?: number;
    collectionRate: string;
    rawCollectionRate?: number;
    totalMemberBalance?: number;
  };
  isLoading?: boolean;
}

export default function MetricsOverview({ stats, isLoading }: MetricsProps) {
  const { language } = useLanguage();

  const cards = [
    {
      id: 'orders',
      titleEn: 'Orders Count',
      titleBn: 'অর্ডারের সংখ্যা',
      subtextEn: 'Active Processed',
      subtextBn: 'সম্পন্ন ও প্রক্রিয়াধীন',
      value: stats.ordersCount.toString(),
      unit: language === 'bn' ? 'টি' : 'orders',
      icon: ShoppingBag,
      borderColor: 'border-emerald-500/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-slate-900 dark:text-white',
      glowColor: 'bg-emerald-500',
      badge: 'Live',
      badgeColor: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'totalBill',
      titleEn: 'Total Bill',
      titleBn: 'মোট বিল',
      subtextEn: 'Calculated Price',
      subtextBn: 'নির্ধারিত খাবার মূল্য',
      value: `৳${stats.totalBill.toFixed(2)}`,
      unit: '',
      icon: Receipt,
      borderColor: 'border-amber-500/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
      glowColor: 'bg-amber-500',
      badge: 'Billed',
      badgeColor: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'totalPaid',
      titleEn: 'Total Paid',
      titleBn: 'মোট জমা',
      subtextEn: 'Collected Amount',
      subtextBn: 'নগদ ক্যাশ গ্রহণ',
      value: `৳${stats.totalPaid.toFixed(2)}`,
      unit: '',
      icon: Wallet,
      borderColor: 'border-teal-500/40',
      iconColor: 'text-teal-600 dark:text-teal-300',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      glowColor: 'bg-teal-500',
      badge: 'Received',
      badgeColor: 'border-teal-500/40 text-teal-700 dark:text-teal-300',
    },
    {
      id: 'refundChange',
      titleEn: 'Refundable (Change)',
      titleBn: 'ফেরতযোগ্য (বাকি)',
      subtextEn: 'Customer Change',
      subtextBn: 'গ্রাহককে ফেরতযোগ্য ক্যাশ',
      value: `৳${stats.totalRefundChange.toFixed(2)}`,
      unit: '',
      icon: Coins,
      borderColor: 'border-sky-500/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
      valueColor: 'text-sky-700 dark:text-sky-300',
      glowColor: 'bg-sky-500',
      badge: 'Change',
      badgeColor: 'border-sky-500/40 text-sky-700 dark:text-sky-300',
    },
    ...(stats.totalMemberBalance !== undefined ? [{
      id: 'memberBalance',
      titleEn: 'Total Member Balance',
      titleBn: 'মোট সংরক্ষিত ব্যালেন্স',
      subtextEn: 'Live Member Wallets',
      subtextBn: 'সদস্যদের সক্রিয় ব্যালেন্স',
      value: `৳${stats.totalMemberBalance.toFixed(2)}`,
      unit: '',
      icon: Wallet,
      borderColor: 'border-emerald-500/40',
      iconColor: 'text-emerald-600 dark:text-emerald-300',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      glowColor: 'bg-emerald-500',
      badge: 'Live Balances',
      badgeColor: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    }] : []),
    {
      id: 'rate',
      titleEn: 'Collection Rate',
      titleBn: 'আদায়ের হার',
      subtextEn: 'Cash Flow Velocity',
      subtextBn: 'পরিশোধ ও আদায় সূচক',
      value: stats.collectionRate,
      unit: '',
      icon: TrendingUp,
      borderColor: 'border-amber-400/40',
      iconColor: 'text-amber-600 dark:text-amber-300',
      valueColor: 'text-amber-700 dark:text-amber-300',
      glowColor: 'bg-amber-500',
      badge: 'High Performance',
      badgeColor: 'border-amber-400/40 text-amber-700 dark:text-amber-300',
    },
  ];

  return (
    <section className="w-full">
      <div className={`grid grid-cols-2 md:grid-cols-3 ${stats.totalMemberBalance !== undefined ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 sm:gap-4`}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:${card.borderColor} p-4 sm:p-5 shadow-md dark:shadow-xl dark:shadow-black/30 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 group`}
            >
              {/* Soft Ambient Radial Corner Glow (subtle & non-intrusive) */}
              <div className={`absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${card.glowColor}`} />

              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 ${card.iconColor} shadow-inner`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${card.badgeColor} bg-slate-100 dark:bg-slate-950/80`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase mb-1">
                  {language === 'bn' ? card.titleBn : card.titleEn}
                </p>
                <div className="flex items-baseline gap-1">
                  <h3 className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight ${card.valueColor}`}>
                    {isLoading ? (
                      <span className="inline-block w-16 h-6 bg-slate-800 animate-pulse rounded" />
                    ) : (
                      card.value
                    )}
                  </h3>
                  {card.unit && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold pl-0.5">
                      {card.unit}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1.5 flex items-center gap-1">
                  <span>{language === 'bn' ? card.subtextBn : card.subtextEn}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
