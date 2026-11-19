'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration: number = 3800) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newItem: ToastItem = { id, message, title, type, duration };

    setToasts((prev) => [newItem, ...prev.slice(0, 4)]); // Keep at most 5 toasts at once

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastMethods = {
    success: (message: string, title?: string) => addToast(message, 'success', title || 'Success'),
    error: (message: string, title?: string) => addToast(message, 'error', title || 'Notice'),
    warning: (message: string, title?: string) => addToast(message, 'warning', title || 'Attention'),
    info: (message: string, title?: string) => addToast(message, 'info', title || 'Information'),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, removeToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full pointer-events-none flex flex-col gap-2.5 sm:max-w-md">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-in slide-in-from-top-3 fade-in duration-200 flex items-start gap-3 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-950/60 text-white'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/60 shadow-rose-950/60 text-white'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/60 text-white'
                  : 'bg-slate-900/95 border-sky-500/60 shadow-sky-950/60 text-white'
              }`}
            >
              {/* Type Icon */}
              <div
                className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4
                    className={`text-xs font-bold font-serif mb-0.5 tracking-tight ${
                      isSuccess
                        ? 'text-emerald-300'
                        : isError
                        ? 'text-rose-300'
                        : isWarning
                        ? 'text-amber-300'
                        : 'text-sky-300'
                    }`}
                  >
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-slate-200 leading-snug break-words">
                  {t.message}
                </p>
              </div>

              {/* Dismiss button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
