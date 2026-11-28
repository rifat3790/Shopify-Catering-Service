'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { DailyDutyAssignment } from '@/lib/types';
import { getBangladeshTodayDateString } from '@/lib/dateFilterUtils';
import { 
  Sparkles, 
  CheckCircle2, 
  ShoppingBag, 
  Coins, 
  Truck, 
  X, 
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function DailyDutyNotificationDialog() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [duty, setDuty] = useState<DailyDutyAssignment | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Duty is auto-accepted when an admin assigns it. This dialog only informs the member,
  // once per assignment (keyed by date + duty id + assignment time), via popup + browser notification.
  const seenKeyFor = (d: DailyDutyAssignment, email: string) =>
    `duty_seen_${d.date}_${d.id}_${d.updatedAt || ''}_${email.toLowerCase()}`;

  const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const safeSet = (k: string) => { try { localStorage.setItem(k, '1'); } catch { } };

  useEffect(() => {
    if (!user || !user.email) return;
    const email = user.email.toLowerCase().trim();
    let cancelled = false;

    const check = () => {
      const today = getBangladeshTodayDateString();
      fetch(`/api/duty?date=${today}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          if (cancelled || !json.success || !json.data) return;
          const todayDuty: DailyDutyAssignment = json.data;
          const assignedEmail = todayDuty.assignedUserEmail?.toLowerCase().trim();
          if (assignedEmail !== email && todayDuty.assignedUserId !== user.uid) return;

          const key = seenKeyFor(todayDuty, email);
          if (safeGet(key)) return;
          safeSet(key);
          setDuty(todayDuty);
          setIsOpen(true);

          // Desktop / mobile browser notification (if the user allowed notifications)
          try {
            if (typeof Notification !== 'undefined') {
              const show = () => new Notification(
                language === 'bn' ? 'আজ আপনার ক্যাটারিং দায়িত্ব' : "You're on catering duty today",
                {
                  body: language === 'bn'
                    ? `${todayDuty.date} তারিখের ক্যাটারিং দায়িত্বের জন্য আপনাকে নির্বাচন করা হয়েছে।`
                    : `You have been selected for catering duty on ${todayDuty.date}.`,
                  icon: '/favicon.ico',
                  tag: key,
                }
              );
              if (Notification.permission === 'granted') show();
              else if (Notification.permission === 'default') {
                Notification.requestPermission().then(p => { if (p === 'granted') show(); }).catch(() => { });
              }
            }
          } catch { }
        })
        .catch(() => { });
    };

    check();
    const timer = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, user?.uid]);

  const handleDismiss = () => {
    setIsOpen(false);
  };

  if (!isOpen || !duty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100">
        
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {duty.date}
              </span>
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {language === 'bn' ? 'আজকের দায়িত্ব' : "Today's Catering Duty"}
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif text-white mt-0.5">
              {language === 'bn' 
                ? 'অভিনন্দন! আজ আপনার ক্যাটারিং দায়িত্ব' 
                : 'Congratulations! You are on Catering Duty Today'}
            </h2>
          </div>
        </div>

        {/* Main message */}
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs sm:text-sm leading-relaxed mb-4">
          <p className="font-medium">
            {language === 'bn'
              ? `প্রিয় ${duty.assignedUserName}, অ্যাডমিন কর্তৃক আজকের দিনের ক্যাটারিং দায়িত্ব আপনাকে অর্পণ করা হয়েছে। অনুগ্রহ করে মেম্বারদের টাকা সংগ্রহ, নাস্তা ক্রয় এবং সঠিক সময়ে পরিবেশন নিশ্চিত করুন।`
              : `Dear ${duty.assignedUserName}, today's team catering duty has been assigned to you. Please collect catering payments, purchase refreshments, and deliver dishes on time.`}
          </p>
          {duty.instructions && (
            <p className="mt-2 text-xs text-amber-300/90 italic border-t border-amber-500/20 pt-2">
              <strong>{language === 'bn' ? 'অ্যাডমিন নির্দেশাবলী:' : 'Instructions:'}</strong> {duty.instructions}
            </p>
          )}
        </div>

        {/* Task Checklist */}
        <div className="space-y-2.5 mb-6">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {language === 'bn' ? 'আপনার ৩টি প্রধান দায়িত্ব:' : 'Your 3 Core Responsibilities:'}
          </p>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {language === 'bn' ? '১. টাকা সংগ্রহ (Collect Money)' : '1. Collect Catering Cash / Payment'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'bn' ? 'সকল সহকর্মীদের থেকে ক্যাটারিং বিল সংগ্রহ করুন।' : 'Collect bill amounts from team members before placing food order.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {language === 'bn' ? '২. নাস্তা ক্রয় (Purchase Food & Snacks)' : '2. Purchase Refreshments'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'bn' ? 'ক্যান্টিন বা দোকান থেকে গরম ও সুস্বাদু নাস্তা ক্রয় করে আনুন।' : 'Purchase fresh and hot dishes from canteen or caterer.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 mt-0.5">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                {language === 'bn' ? '৩. যথাসময়ে পরিবেশন (Deliver & Serve)' : '3. Deliver to Team Members'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'bn' ? 'অফিসের সকল মেম্বারদের মাঝে নাস্তা সুন্দরভাবে বিতরণ করুন।' : 'Distribute the ordered food to all respective members.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'bn' ? 'ঠিক আছে (OK, Got it)' : 'OK, Got it'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
