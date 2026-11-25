'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, Sparkles, Plus, Minus } from 'lucide-react';

interface LuxuryTimePickerProps {
  value: string; // 24h "HH:mm"
  onChange: (newTime24: string) => void;
  disabled?: boolean;
  className?: string;
}

const PRESETS = [
  { label: '08:00 AM', val: '08:00' },
  { label: '08:20 AM', val: '08:20' },
  { label: '08:30 AM', val: '08:30' },
  { label: '09:00 AM', val: '09:00' },
  { label: '09:20 AM', val: '09:20' },
  { label: '10:00 AM', val: '10:00' },
];

function to12Hour(time24: string) {
  const [hStr, mStr] = (time24 || '09:20').split(':');
  const h24 = isNaN(Number(hStr)) ? 9 : Number(hStr);
  const m = isNaN(Number(mStr)) ? 20 : Number(mStr);
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const h12 = (h24 % 12) || 12;
  return { h12, m, period };
}

function to24Hour(h12: number, m: number, period: 'AM' | 'PM'): string {
  let h24 = h12 % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function LuxuryTimePicker({
  value,
  onChange,
  disabled = false,
  className = '',
}: LuxuryTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { h12, m, period } = to12Hour(value);
  const displayFormatted = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const setTime = (nextH12: number, nextM: number, nextP: 'AM' | 'PM') => {
    const safeH = ((nextH12 - 1 + 12) % 12) + 1;
    const safeM = (nextM + 60) % 60;
    onChange(to24Hour(safeH, safeM, nextP));
  };

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minsStep5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-500/70 dark:hover:border-amber-400/70 text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-amber-300 flex items-center justify-between gap-3 shadow-sm transition-all disabled:opacity-50 min-w-[165px]"
      >
        <span>{displayFormatted}</span>
        <span className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 shrink-0">
          <Clock className="w-4 h-4" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-72 sm:w-80 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-amber-500/40 shadow-2xl backdrop-blur-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="font-serif font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Select Time (BDT)
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono font-bold text-xs">
              {displayFormatted}
            </span>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Presets
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    onChange(p.val);
                    setOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold border transition-all ${
                    value === p.val
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 border-transparent shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Hour / Minute / AM-PM Grid */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
            {/* Hours */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hour</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTime(h12 - 1, m, period)}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTime(h12 + 1, m, period)}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {hoursList.map((hr) => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => setTime(hr, m, period)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      h12 === hr
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {String(hr).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Minute (exact ±1m)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTime(h12, m - 1, period)}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-300">
                    {String(m).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTime(h12, m + 1, period)}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {minsStep5.map((mn) => (
                  <button
                    key={mn}
                    type="button"
                    onClick={() => setTime(h12, mn, period)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      m === mn
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {String(mn).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM / PM & Done */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
                {(['AM', 'PM'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTime(h12, m, p)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      period === p
                        ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
