'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

function formatCutoff12Hour(hhmm: string): string {
  const [h, m] = (hhmm || '09:20').split(':').map(Number);
  const safeH = isNaN(h) ? 9 : h;
  const safeM = isNaN(m) ? 20 : m;
  const ampm = safeH >= 12 ? 'PM' : 'AM';
  const h12 = safeH % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(safeM).padStart(2, '0')} ${ampm}`;
}

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
  const prevAllowedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const pingTelegramAutomator = () => {
      fetch('/api/telegram/automate', { cache: 'no-store' }).catch(() => {});
    };

    const fetchStatus = () => {
      fetch(`/api/settings/orders?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setControl(res.data);
            const nowAllowed = Boolean(res.data.isOrderAllowedNow && res.data.ordersEnabled);
            // If cutoff time just closed during an active session, trigger Telegram immediately
            if (prevAllowedRef.current === true && !nowAllowed) {
              pingTelegramAutomator();
            }
            prevAllowedRef.current = nowAllowed;
          }
        })
        .catch(() => {});
    };

    fetchStatus();
    pingTelegramAutomator();

    const onControlUpdate = () => fetchStatus();
    window.addEventListener('orderControlUpdated', onControlUpdate);

    const statusTimer = setInterval(fetchStatus, 20000);
    const botTimer = setInterval(pingTelegramAutomator, 20000);
    return () => {
      window.removeEventListener('orderControlUpdated', onControlUpdate);
      clearInterval(statusTimer);
      clearInterval(botTimer);
    };
  }, []);

  if (!control || dismissed) return null;

  const isAllowed = control.isOrderAllowedNow && control.ordersEnabled;
  const cutoffTime = control.evaluation?.cutoffTime || formatCutoff12Hour(control.dailyCutoffTime || '09:20');

  // Always replace stale 09:20 / default notice time with the live configured cutoffTime!
  const rawNoticeBn =
    control.noticeMessageBn ||
    `প্রতিদিন ${cutoffTime}-এর মধ্যে খাবার অর্ডার করতে হবে। এরপর অর্ডার স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।`;
  const dynamicNoticeBn = rawNoticeBn.includes('৯:২০') || rawNoticeBn.includes('09:20')
    ? `প্রতিদিন ${cutoffTime}-এর মধ্যে খাবার অর্ডার করতে হবে। এরপর অর্ডার স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।`
    : rawNoticeBn;

  const rawNoticeEn = control.noticeMessageEn || '';
  const dynamicNoticeEn =
    !rawNoticeEn ||
    rawNoticeEn.includes('09:20 AM') ||
    rawNoticeEn.startsWith('Catering orders must be placed by')
      ? `Catering orders must be placed by ${cutoffTime} daily.`
      : rawNoticeEn;

  const customNotice = language === 'bn' ? dynamicNoticeBn : dynamicNoticeEn;

  const AnnouncementItemBlock = () => (
    <div className="flex items-center gap-8 px-5 shrink-0 font-semibold text-[11.5px] tracking-wide">
      <span className="flex items-center gap-1.5 text-white">
        <span>📢</span>
        <span>{customNotice}</span>
      </span>

      <span className="text-white/40">•</span>

      <span className="flex items-center gap-1.5 text-amber-200">
        <span>⏰</span>
        <span>
          {language === 'bn'
            ? `প্রতিদিন ${cutoffTime}-এর মধ্যে অর্ডার করতে হবে। এরপর স্বয়ংক্রিয়ভাবে বন্ধ হবে।`
            : `Daily order closes at ${cutoffTime}. System will automatically stop accepting orders.`}
        </span>
      </span>

      <span className="text-white/40">•</span>

      <span className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isAllowed ? 'bg-emerald-300 animate-ping' : 'bg-rose-300 animate-pulse'
          }`}
        />
        <span className="font-bold text-white">
          {isAllowed
            ? language === 'bn'
              ? 'অর্ডার গ্রহণ চলছে (OPEN)'
              : 'Orders Currently Open'
            : language === 'bn'
            ? 'আজকের অর্ডার বন্ধ (CLOSED)'
            : 'Orders Closed for Today'}
        </span>
      </span>

      <span className="text-amber-300/70">✦</span>
    </div>
  );

  // Explicit inline background colors immune to themeConstants.ts emerald pill CSS overrides
  const barStyle: React.CSSProperties = isAllowed
    ? {
        backgroundColor: '#052e22',
        borderColor: 'rgba(52, 211, 153, 0.35)',
        color: '#ffffff',
      }
    : {
        backgroundColor: '#3a0915',
        borderColor: 'rgba(251, 113, 133, 0.35)',
        color: '#ffffff',
      };

  const badgeStyle: React.CSSProperties = isAllowed
    ? { backgroundColor: '#052e22' }
    : { backgroundColor: '#3a0915' };

  return (
    <div
      style={barStyle}
      className="relative z-40 w-full overflow-hidden border-b transition-colors shadow-md"
    >
      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
        {/* Fixed Left Status Badge */}
        <div
          style={badgeStyle}
          className="flex items-center gap-1.5 shrink-0 pr-3 z-20 shadow-[8px_0_16px_rgba(0,0,0,0.45)]"
        >
          <div
            className={`p-1 rounded-md ${
              isAllowed ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-bold font-mono uppercase text-[11px] tracking-wide whitespace-nowrap text-white">
            {isAllowed
              ? language === 'bn'
                ? `কাট-অফ: ${cutoffTime}`
                : `CUTOFF: ${cutoffTime}`
              : language === 'bn'
              ? 'অর্ডার বন্ধ (CLOSED)'
              : 'ORDERS CLOSED'}
          </span>
        </div>

        {/* Seamless Infinite Continuous Scrolling Marquee */}
        <div className="flex-1 overflow-hidden relative h-5 select-none flex items-center">
          <div className="marquee-infinite-track flex items-center whitespace-nowrap">
            <AnnouncementItemBlock />
            <AnnouncementItemBlock />
            <AnnouncementItemBlock />
            <AnnouncementItemBlock />
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 p-1 rounded hover:bg-white/15 text-white/80 hover:text-white transition-all shrink-0 z-20"
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
