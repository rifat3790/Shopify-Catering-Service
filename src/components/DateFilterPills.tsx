'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { DateFilterType } from '@/lib/dateFilterUtils';
import { Calendar, Clock, Sparkles } from 'lucide-react';

interface DateFilterPillsProps {
  selected: DateFilterType;
  onChange: (filter: DateFilterType) => void;
  counts?: Partial<Record<DateFilterType, number>>;
  className?: string;
}

export default function DateFilterPills({
  selected,
  onChange,
  counts,
  className = '',
}: DateFilterPillsProps) {
  const { language } = useLanguage();

  const options: Array<{ id: DateFilterType; labelEn: string; labelBn: string }> = [
    { id: 'today', labelEn: 'Today', labelBn: 'আজকে (Today)' },
    { id: 'yesterday', labelEn: 'Yesterday', labelBn: 'গতকাল (Yesterday)' },
    { id: '7days', labelEn: 'Last 7 Days', labelBn: 'গত ৭ দিন' },
    { id: '30days', labelEn: 'Last 30 Days', labelBn: 'গত ৩০ দিন' },
    { id: '1year', labelEn: '1 Year', labelBn: '১ বছর' },
    { id: 'lifetime', labelEn: 'Lifetime', labelBn: 'সর্বমোট (Lifetime)' },
  ];

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin ${className}`}>
      <div className="flex items-center gap-1 px-2.5 py-1 text-slate-600 dark:text-slate-400 text-xs font-semibold shrink-0">
        <Calendar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        <span>{language === 'bn' ? 'সময়কাল:' : 'Period:'}</span>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 shadow-xs">
        {options.map((opt) => {
          const isActive = selected === opt.id;
          const count = counts ? counts[opt.id] : undefined;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold shadow-sm scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold leading-none ${
                    isActive
                      ? 'bg-black/20 text-white border border-white/25'
                      : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
