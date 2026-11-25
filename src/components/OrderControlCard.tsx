'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import LuxuryTimePicker from '@/components/LuxuryTimePicker';
import { 
  Clock, 
  Power, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Save,
  Lock,
  Unlock,
  Bell
} from 'lucide-react';

export default function OrderControlCard() {
  const { language } = useLanguage();
  const { toast } = useToast();

  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [dailyCutoffTime, setDailyCutoffTime] = useState('09:20');
  const [cutoffEnabled, setCutoffEnabled] = useState(true);
  const [noticeMessageBn, setNoticeMessageBn] = useState('');
  const [isOrderAllowedNow, setIsOrderAllowedNow] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/orders');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrdersEnabled(Boolean(json.data.ordersEnabled));
          setDailyCutoffTime(json.data.dailyCutoffTime || '09:20');
          setCutoffEnabled(Boolean(json.data.cutoffEnabled));
          setNoticeMessageBn(json.data.noticeMessageBn || '');
          setIsOrderAllowedNow(Boolean(json.data.isOrderAllowedNow));
          setEvaluation(json.data.evaluation);
        }
      }
    } catch (err) {
      console.warn('Failed to load order settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersEnabled,
          dailyCutoffTime,
          cutoffEnabled,
          noticeMessageBn,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setIsOrderAllowedNow(Boolean(json.data.isOrderAllowedNow));
        setEvaluation(json.data.evaluation);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('orderControlUpdated'));
        }
        toast.success(
          !json.data.isOrderAllowedNow
            ? (language === 'bn'
                ? 'অর্ডার সময়সীমা বন্ধ হয়েছে এবং টেলিগ্রাম গ্রুপে আজকের অর্ডার টেবিল ইমেজ পাঠানো হয়েছে!'
                : 'Orders closed & Telegram group report with Order Table PNG triggered!')
            : (language === 'bn'
                ? 'অর্ডার কন্ট্রোল ও সময়সীমা সফলভাবে ডাটাবেজে সংরক্ষিত হয়েছে!'
                : 'Order cutoff settings saved to database successfully!'),
          'Settings Saved ⏱️'
        );
      } else {
        toast.error(json.error || 'Failed to save settings', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings', 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-emerald-800/60 shadow-xl space-y-6">
      
      {/* Title & Live Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-serif flex items-center gap-2">
              <span>{language === 'bn' ? 'অর্ডার কন্ট্রোল ও দৈনিক সময়সীমা (Daily Cutoff)' : 'Order System & Daily Cutoff Control'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-bold">
                Dynamic MongoDB
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'bn' 
                ? 'অর্ডার চালু/বন্ধ রাখা এবং প্রতিদিন নির্দিষ্ট সময় (যেমন সকাল ৯:২০) পর্যন্ত অর্ডার নিয়ন্ত্রণ করুন'
                : 'Toggle global order intake and enforce daily cutoff timing (e.g., 09:20 AM)'}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 shrink-0 ${
          isOrderAllowedNow
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-950/40'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-lg shadow-rose-950/40'
        }`}>
          {isOrderAllowedNow ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{language === 'bn' ? '🟢 মেম্বার অর্ডার সক্রিয় (Orders OPEN)' : '🟢 Orders OPEN for Members'}</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-rose-400" />
              <span>{language === 'bn' ? '🔴 অর্ডার নিষ্ক্রিয় / সময় শেষ (Orders CLOSED)' : '🔴 Orders CLOSED'}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* 1. Global Order Master Switch */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Power className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? '১. অর্ডার পাওয়ার সুইচ (Master Switch)' : '1. Master Order Switch'}</span>
              </label>
              <button
                type="button"
                onClick={() => setOrdersEnabled(!ordersEnabled)}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  ordersEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    ordersEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {ordersEnabled
                ? (language === 'bn' ? '✓ খাবার অর্ডার গ্রহণ চালু আছে।' : '✓ Order placement is globally enabled.')
                : (language === 'bn' ? '⚠️ খাবার অর্ডার সাময়িকভাবে বন্ধ আছে (কোনো সাধারণ ইউজার অর্ডার করতে পারবে না)।' : '⚠️ Order intake is halted.')}
            </p>
          </div>

          {/* 2. Daily Cutoff Time Setting */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{language === 'bn' ? '২. দৈনিক অর্ডার শেষ সময় (Cutoff Time)' : '2. Daily Cutoff Time'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={cutoffEnabled}
                  onChange={(e) => setCutoffEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300 font-semibold">{language === 'bn' ? 'সময়সীমা কার্যকর' : 'Enforce Cutoff'}</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LuxuryTimePicker
                value={dailyCutoffTime}
                onChange={setDailyCutoffTime}
                disabled={!cutoffEnabled}
              />
              <span className="text-xs text-slate-400 font-medium">
                {language === 'bn' 
                  ? `(প্রতিদিন এই সময়ের পর সাধারণ ব্যবহারকারীদের অর্ডার বাটন নিষ্ক্রিয় হবে)`
                  : `(Orders automatically close after this time daily)`}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Notice Message to Users */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>{language === 'bn' ? '৩. মেম্বারদের জন্য নোটিশ বার্তা (Notice to Members)' : '3. Notice Message for Members'}</span>
          </label>
          <input
            type="text"
            value={noticeMessageBn}
            onChange={(e) => setNoticeMessageBn(e.target.value)}
            placeholder="প্রতিদিন সকাল ৯:২০ এর মধ্যে খাবার অর্ডার করুন।"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Evaluation Summary Box */}
        {evaluation && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            evaluation.allowed
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/30 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {evaluation.allowed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {language === 'bn' ? evaluation.messageBn : evaluation.messageEn}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {evaluation.cutoffTime ? `Current Cutoff: ${evaluation.cutoffTime}` : ''}
                  {evaluation.remainingMinutes > 0 ? ` • Remaining: ${evaluation.remainingMinutes} minutes` : ''}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              Bangladesh Time (GMT+6)
            </span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{language === 'bn' ? 'সেটিংস সেভ করুন (Save Settings)' : 'Save Settings to MongoDB'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
