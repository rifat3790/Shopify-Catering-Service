'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  ShoppingBag, 
  Receipt, 
  Wallet, 
  Coins, 
  TrendingUp, 
  ArrowUpRight 
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
      color: 'from-emerald-500/20 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      badge: 'Live',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
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
      color: 'from-amber-500/20 to-orange-500/10',
      borderColor: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      badge: 'Billed',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
      color: 'from-teal-500/20 to-emerald-500/10',
      borderColor: 'border-teal-500/30',
      iconColor: 'text-teal-300',
      badge: 'Received',
      badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
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
      color: 'from-sky-500/20 to-indigo-500/10',
      borderColor: 'border-sky-500/30',
      iconColor: 'text-sky-400',
      badge: 'Change',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
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
      color: 'from-emerald-500/20 to-amber-500/10',
      borderColor: 'border-emerald-500/40',
      iconColor: 'text-emerald-300',
      badge: 'Live Balances',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
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
      color: 'from-amber-600/20 to-yellow-500/10',
      borderColor: 'border-amber-400/40',
      iconColor: 'text-amber-300',
      badge: 'High Performance',
      badgeColor: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
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
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-b ${card.color} bg-slate-900/80 backdrop-blur-xl border ${card.borderColor} p-4 sm:p-5 shadow-lg shadow-black/20 hover:scale-[1.02] transition-all duration-300 group`}
            >
              {/* Subtle Ambient Radial Glow */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl bg-slate-950/60 border border-slate-800 ${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-300 mb-1">
                  {language === 'bn' ? card.titleBn : card.titleEn}
                </p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
                    {isLoading ? (
                      <span className="inline-block w-16 h-6 bg-slate-800 animate-pulse rounded" />
                    ) : (
                      card.value
                    )}
                  </h3>
                  {card.unit && (
                    <span className="text-xs text-slate-400 font-normal">
                      {card.unit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
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

