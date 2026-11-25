'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface LuxurySelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface LuxurySelectProps {
  value: string;
  onChange: (val: string) => void;
  options: LuxurySelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
  direction?: 'down' | 'up';
  searchable?: boolean;
}

export default function LuxurySelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  triggerClassName = '',
  align = 'left',
  direction = 'down',
  searchable,
}: LuxurySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 7;

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.subLabel && o.subLabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-amber-500/70 dark:hover:border-amber-400/70 text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between gap-2 shadow-sm transition-all disabled:opacity-50 ${triggerClassName}`}
      >
        <span className={`truncate ${!selected ? 'text-slate-400 dark:text-slate-500' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          } z-50 min-w-full w-64 sm:w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-amber-500/40 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Top Accent Gradient */}
          <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500" />

          {showSearch && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No matching options</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500/20 to-amber-500/20 text-emerald-700 dark:text-amber-300 font-bold border border-emerald-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{opt.label}</p>
                      {opt.subLabel && (
                        <p className="text-[10px] text-slate-400 font-mono truncate">{opt.subLabel}</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-amber-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
