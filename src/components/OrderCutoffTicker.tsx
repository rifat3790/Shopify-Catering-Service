'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Sparkles, Volume2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function OrderCutoffTicker() {
  const { language } = useLanguage();
  const [control, setControl] = useState<{
    ordersEnabled: boolean;
    dailyCutoffTime: string;
    cutoffEnabled: boolean;
    isOrderAllowedNow: boolean;
    noticeMessage?: string;
    evaluation?: any;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/settings/orders')
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setControl(res.data);
          }
        })
        .catch(() => {});
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!control || dismissed) return null;

  const isCutoffOn = control.cutoffEnabled && control.dailyCutoffTime;
  const isAllowed = control.isOrderAllowedNow && control.ordersEnabled;
  const cutoffTime = control.dailyCutoffTime || '09:20 AM';
  const customNotice = control.noticeMessage || (language === 'bn' ? 'সকল মেম্বারদের নির্ধারিত সময়ের মধ্যে খাবার অর্ডার কনফার্ম করতে অনুরোধ করা হচ্ছে।' : 'Please submit your catering order before daily cutoff.');

  return (
    <div className={`relative z-40 w-full overflow-hidden border-b transition-colors ${
      isAllowed
        ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
        : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
    }`}>
      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
        
        {/* Fixed Left Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0 pr-3 z-10 bg-inherit shadow-md">
          <div className={`p-1 rounded-md ${
            isAllowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            <Clock className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-bold font-mono uppercase text-[11px] tracking-wide">
            {isAllowed 
              ? (language === 'bn' ? `কাট-অফ সময়: ${cutoffTime}` : `CUTOFF: ${cutoffTime}`)
              : (language === 'bn' ? 'অর্ডার সমাপ্ত (CLOSED)' : 'ORDERS CLOSED')}
          </span>
        </div>

        {/* Scrolling Smooth Marquee Ticker */}
        <div className="flex-1 overflow-hidden relative h-5 select-none flex items-center">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-8 font-medium text-[11px]">
            <span className="flex items-center gap-1.5">
              <span>📢</span>
              <span>{customNotice}</span>
            </span>

            <span>•</span>

            <span className="flex items-center gap-1.5">
              <span>⏰</span>
              <span>
                {language === 'bn'
                  ? `প্রতিদিন সকাল ${cutoffTime}-এর মধ্যে অর্ডার করতে হবে। এরপর স্বয়ংক্রিয়ভাবে বন্ধ হবে।`
                  : `Daily order closes at ${cutoffTime}. System will automatically stop accepting orders.`}
              </span>
            </span>

            <span>•</span>

            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAllowed ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              <span className="font-bold">
                {isAllowed
                  ? (language === 'bn' ? 'অর্ডার গ্রহণ চলছে' : 'Orders Currently Open')
                  : (language === 'bn' ? 'আজকের অর্ডার বন্ধ' : 'Orders Closed for Today')}
              </span>
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 p-1 rounded hover:bg-black/20 text-current opacity-70 hover:opacity-100 transition-opacity shrink-0"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 28s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
