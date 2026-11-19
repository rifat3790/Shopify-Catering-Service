'use client';

import React from 'react';
import { Sparkles, UtensilsCrossed } from 'lucide-react';

interface LuxuryLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  subMessage?: string;
}

export default function LuxuryLoader({ 
  message = 'Loading...', 
  size = 'md',
  subMessage
}: LuxuryLoaderProps) {
  if (size === 'fullscreen') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient golden/emerald glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center space-y-4 p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-emerald-800/60 shadow-2xl backdrop-blur-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
          {/* Animated Spinner Icon */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-amber-400 border-r-emerald-400 animate-spin" />
            <div className="absolute inset-1.5 rounded-full border border-emerald-500/10 border-b-amber-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="font-serif font-bold text-white text-base tracking-wide">Shopify Catering</h3>
            <p className="text-xs font-medium text-emerald-400/90 mt-1.5 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span>{message}</span>
            </p>
            {subMessage && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{subMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2 justify-center text-xs text-slate-400 py-2">
        <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-amber-400 animate-spin" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-amber-400 border-r-emerald-400 animate-spin" />
        <div className="w-full h-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-200">{message}</p>
        {subMessage && (
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
