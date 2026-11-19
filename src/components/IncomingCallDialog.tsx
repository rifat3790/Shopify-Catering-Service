'use client';

import React, { useEffect } from 'react';
import { Phone, PhoneOff, ShieldCheck } from 'lucide-react';
import { playIncomingRingtone } from '@/lib/callSounds';

interface IncomingCallDialogProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  callerRole?: string;
  callerDepartment?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({
  isOpen,
  callerName,
  callerAvatar,
  callerRole = 'Colleague',
  callerDepartment = 'Shopify Catering',
  onAccept,
  onDecline
}: IncomingCallDialogProps) {

  // Play ringing sound continuously while incoming call dialog is open
  useEffect(() => {
    if (!isOpen) return;

    const stopRingtone = playIncomingRingtone();
    return () => {
      stopRingtone();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-emerald-500/60 p-7 shadow-2xl text-center space-y-6 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Ambient Ringing Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 blur-[70px] rounded-full pointer-events-none" />

        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-emerald-500/40 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Incoming Shopify Voice Call</span>
        </div>

        {/* Pulsing Avatar with Waves */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute -inset-3 rounded-full border border-amber-400/30 animate-pulse" />
          <img
            src={callerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=047857&color=fff`}
            alt={callerName}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500 shadow-2xl relative z-10"
          />
        </div>

        {/* Caller Info */}
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-xl text-white tracking-wide">
            {callerName}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {callerRole} • {callerDepartment}
          </p>
          <div className="pt-2">
            <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-pulse">
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              <span>Incoming Voice Call...</span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Decline & Accept */}
        <div className="flex items-center justify-center gap-6 pt-3">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/60 group-hover:scale-110 active:scale-95 transition-all">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-rose-300">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-950/60 group-hover:scale-110 active:scale-95 transition-all animate-pulse">
              <Phone className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-400">Accept</span>
          </button>
        </div>

      </div>
    </div>
  );
}
