'use client';

import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function OrderCutoffTicker() {
  const { language } = useLanguage();
  const [control, setControl] = useState<{
    ordersEnabled: boolean;
    dailyCutoffTime: string;
    cutoffEnabled: boolean;
    isOrderAllowedNow: boolean;
    noticeMessage?: string;
    noticeMessageBn?: string;
    noticeMessageEn?: string;
    evaluation?: any;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/settings/orders', { cache: 'no-store' })
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setControl(res.data);
          }
        })
        .catch(() => {});
    };

    const pingTelegramAutomator = () => {
      // Idempotent server-side scheduler: checks 08:20 AM BDT alert & cutoff close table report
      fetch('/api/telegram/automate', { cache: 'no-store' }).catch(() => {});
    };

    fetchStatus();
    pingTelegramAutomator();

    const statusTimer = setInterval(fetchStatus, 30000);
    const botTimer = setInterval(pingTelegramAutomator, 60000);
    return () => {
      clearInterval(statusTimer);
      clearInterval(botTimer);
    };
  }, []);

  if (!control || dismissed) return null;

  const isAllowed = control.isOrderAllowedNow && control.ordersEnabled;
  const cutoffTime = control.evaluation?.cutoffTime || control.dailyCutoffTime || '09:20 AM';
  const customNotice =
    (language === 'bn' ? control.noticeMessageBn : control.noticeMessageEn) ||
    control.noticeMessage ||
    (language === 'bn'
      ? 'সকল মেম্বারদের নির্ধারিত সময়ের মধ্যে খাবার অর্ডার কনফার্ম করতে অনুরোধ করা হচ্ছে।'
      : 'Please submit your catering order before daily cutoff.');

  const AnnouncementItemBlock = () => (
    <div className="flex items-center gap-8 px-5 shrink-0 font-medium text-[11px]">
      <span className="flex items-center gap-1.5">
        <span>📢</span>
        <span>{customNotice}</span>
      </span>

      <span className="opacity-40">•</span>

      <span className="flex items-center gap-1.5">
        <span>⏰</span>
        <span>
          {language === 'bn'
            ? `প্রতিদিন সকাল ${cutoffTime}-এর মধ্যে অর্ডার করতে হবে। এরপর স্বয়ংক্রিয়ভাবে বন্ধ হবে।`
            : `Daily order closes at ${cutoffTime}. System will automatically stop accepting orders.`}
        </span>
      </span>

      <span className="opacity-40">•</span>

      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isAllowed ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-pulse'}`} />
        <span className="font-bold">
          {isAllowed
            ? (language === 'bn' ? 'অর্ডার গ্রহণ চলছে (OPEN)' : 'Orders Currently Open')
            : (language === 'bn' ? 'আজকের অর্ডার বন্ধ (CLOSED)' : 'Orders Closed for Today')}
        </span>
      </span>

      <span className="opacity-40">✦</span>
    </div>
  );

  return (
    <div
      className={`relative z-40 w-full overflow-hidden border-b transition-colors ${
        isAllowed
          ? 'bg-emerald-950/95 border-emerald-500/35 text-emerald-100'
          : 'bg-rose-950/95 border-rose-500/35 text-rose-100'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
        {/* Fixed Left Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0 pr-3 z-20 bg-inherit shadow-[8px_0_16px_rgba(0,0,0,0.4)]">
          <div
            className={`p-1 rounded-md ${
              isAllowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-bold font-mono uppercase text-[11px] tracking-wide whitespace-nowrap">
            {isAllowed
              ? language === 'bn'
                ? `কাট-অফ: ${cutoffTime}`
                : `CUTOFF: ${cutoffTime}`
              : language === 'bn'
              ? 'অর্ডার বন্ধ (CLOSED)'
              : 'ORDERS CLOSED'}
          </span>
        </div>

        {/* Seamless Infinite Continuous Scrolling Marquee (never stops or leaves empty gap) */}
        <div className="flex-1 overflow-hidden relative h-5 select-none flex items-center">
          <div className="marquee-infinite-track flex items-center whitespace-nowrap">
            {/* Duplicate groups evenly so -50% translation loops infinitely with 0 seam */}
            <AnnouncementItemBlock />
            <AnnouncementItemBlock />
            <AnnouncementItemBlock />
            <AnnouncementItemBlock />
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 p-1 rounded hover:bg-black/25 text-current opacity-75 hover:opacity-100 transition-opacity shrink-0 z-20"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style jsx>{`
        @keyframes marquee-infinite {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .marquee-infinite-track {
          display: flex;
          width: max-content;
          animation: marquee-infinite 38s linear infinite;
          will-change: transform;
        }
        .marquee-infinite-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
