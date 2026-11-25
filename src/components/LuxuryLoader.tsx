'use client';

import React from 'react';
import { Sparkles, UtensilsCrossed } from 'lucide-react';

interface LuxuryLoaderProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'fullscreen';
  subMessage?: string;
  inline?: boolean;
}

export function LuxurySpinnerIcon({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const dims =
    size === 'xs'
      ? 'w-4 h-4'
      : size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
      ? 'w-16 h-16'
      : 'w-12 h-12';

  const innerRing =
    size === 'xs'
      ? 'inset-[2px]'
      : size === 'sm'
      ? 'inset-[3px]'
      : size === 'lg'
      ? 'inset-1.5'
      : 'inset-1';

  const iconSize =
    size === 'xs'
      ? 'w-2 h-2'
      : size === 'sm'
      ? 'w-3 h-3'
      : size === 'lg'
      ? 'w-6 h-6'
      : 'w-4 h-4';

  return (
    <div className={`relative ${dims} shrink-0`}>
      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-amber-400 border-r-emerald-400 animate-spin" />
      <div
        className={`absolute ${innerRing} rounded-full border border-emerald-500/15 border-b-amber-300 animate-spin`}
        style={{ animationDirection: 'reverse', animationDuration: '1.4s' }}
      />
      <div className="w-full h-full flex items-center justify-center">
        <UtensilsCrossed className={`${iconSize} text-amber-400 animate-pulse`} />
      </div>
    </div>
  );
}

export default function LuxuryLoader({
  message = 'Loading...',
  size = 'md',
  subMessage,
  inline = false,
}: LuxuryLoaderProps) {
  if (size === 'fullscreen') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient golden/emerald glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center space-y-4 p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-emerald-800/60 shadow-2xl backdrop-blur-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex justify-center">
            <LuxurySpinnerIcon size="lg" />
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

  if (inline || size === 'xs') {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-slate-300">
        <LuxurySpinnerIcon size={size === 'xs' ? 'xs' : 'sm'} />
        {message && <span>{message}</span>}
      </span>
    );
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2.5 justify-center text-xs text-slate-400 py-3">
        <LuxurySpinnerIcon size="sm" />
        <span className="font-medium text-slate-300">{message}</span>
      </div>
    );
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-200">
      <LuxurySpinnerIcon size={size === 'lg' ? 'lg' : 'md'} />
      <div>
        <p className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>{message}</span>
        </p>
        {subMessage && (
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
