'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { LuxurySpinnerIcon } from './LuxuryLoader';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  highlightText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  highlightText,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => !loading && onClose()}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div
          className={`h-1.5 w-full ${
            isDanger
              ? 'bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600'
              : 'bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500'
          }`}
        />

        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 text-center space-y-4">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-lg ${
              isDanger
                ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400'
                : 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isDanger ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {description}
            </p>
          </div>

          {highlightText && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold text-xs text-amber-700 dark:text-amber-300 inline-block max-w-full truncate">
              {highlightText}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                isDanger
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400'
                  : 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500'
              }`}
            >
              {loading ? <LuxurySpinnerIcon size="xs" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{loading ? 'Processing...' : confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
