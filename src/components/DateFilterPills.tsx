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
      <div className="flex items-center gap-1 px-2.5 py-1 text-slate-400 text-xs font-semibold shrink-0">
        <Calendar className="w-3.5 h-3.5 text-amber-400" />
        <span>{language === 'bn' ? 'সময়কাল:' : 'Period:'}</span>
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-emerald-900/40 shadow-inner">
        {options.map((opt) => {
          const isActive = selected === opt.id;
          const count = counts ? counts[opt.id] : undefined;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-amber-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <span>{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-slate-950/30 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
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
