'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getBangladeshTodayDateString } from '@/lib/dateFilterUtils';

interface LuxuryDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (newDate: string) => void;
  disabled?: boolean;
  className?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYMD(ymd: string) {
  const parts = (ymd || '').split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return { year: parts[0], month: parts[1] - 1, day: parts[2] };
  }
  const today = getBangladeshTodayDateString().split('-').map(Number);
  return { year: today[0], month: today[1] - 1, day: today[2] };
}

function formatDisplayDate(ymd: string): string {
  const { year, month, day } = parseYMD(ymd);
  const shortMonth = MONTHS[month]?.slice(0, 3) || '';
  const todayStr = getBangladeshTodayDateString();
  const label = ymd === todayStr ? 'Today • ' : '';
  return `${label}${String(day).padStart(2, '0')} ${shortMonth} ${year}`;
}

export default function LuxuryDatePicker({
  value,
  onChange,
  disabled = false,
  className = '',
}: LuxuryDatePickerProps) {
  const [open, setOpen] = useState(false);
  const initial = parseYMD(value);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseYMD(value);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [value]);

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

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = getBangladeshTodayDateString();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (d: number) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(formatted);
    setOpen(false);
  };

  const handleSelectShortcut = (offsetDays: number) => {
    const base = parseYMD(todayStr);
    const dt = new Date(base.year, base.month, base.day + offsetDays);
    const formatted = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    onChange(formatted);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-amber-500/70 dark:hover:border-amber-400/70 text-xs font-mono font-bold text-slate-900 dark:text-amber-300 flex items-center justify-between gap-2.5 shadow-sm transition-all disabled:opacity-50"
      >
        <span className="truncate">{formatDisplayDate(value)}</span>
        <span className="p-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto z-50 mt-2 w-72 sm:w-80 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-amber-500/40 shadow-2xl backdrop-blur-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Accent */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-slate-900 dark:text-white">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>
                {MONTHS[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelectShortcut(0)}
              className="py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 text-[11px] font-bold transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSelectShortcut(1)}
              className="py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 text-[11px] font-bold transition-colors"
            >
              Tomorrow
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateKey === value;
              const isToday = dateKey === todayStr;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDay(dayNum)}
                  className={`h-8 rounded-xl text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 shadow-md scale-105'
                      : isToday
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
