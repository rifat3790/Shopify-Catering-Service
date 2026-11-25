'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { DailyDutyAssignment } from '@/lib/types';
import { 
  Calendar, 
  UserCheck, 
  Phone, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function DailyDutyScheduleCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [duties, setDuties] = useState<DailyDutyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetch('/api/duty')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setDuties(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayDuty = duties.find(d => d.date === todayStr);
  const upcomingDuties = duties
    .filter(d => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-amber-500/30 p-5 sm:p-6 shadow-xl relative overflow-hidden">
      
      {/* Decorative luxury gradient tint */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-amber-500/10 via-emerald-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {language === 'bn' ? 'দৈনিক রোস্টার' : 'Daily Rotation'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {todayStr}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-serif text-slate-900 dark:text-white mt-0.5">
              {language === 'bn' ? 'আজকের ক্যাটারিং দায়িত্ব ও রোস্টার' : "Today's Catering Duty & Roster"}
            </h3>
          </div>
        </div>

        {isSuperOrAdmin && (
          <Link
            href="/super-admin?tab=duties"
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 shrink-0"
          >
            <span>{language === 'bn' ? 'ম্যানেজ রোস্টার' : 'Manage'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Today's In-Charge Spotlight Card */}
      {todayDuty ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/30 dark:border-amber-500/40 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={todayDuty.assignedUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(todayDuty.assignedUserName)}&background=047857&color=fff`}
                alt={todayDuty.assignedUserName}
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-amber-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wide">
                    {language === 'bn' ? 'আজকের ইন-চার্জ' : 'In-Charge Today'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                    todayDuty.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                      : (todayDuty.status === 'in_progress'
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40')
                  }`}>
                    {todayDuty.status === 'completed' ? 'Delivered' : (todayDuty.status === 'in_progress' ? 'In Progress' : 'Assigned')}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
                  {todayDuty.assignedUserName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {todayDuty.assignedUserEmail}
                </p>
              </div>
            </div>

            {/* Quick Contact & Info */}
            <div className="flex items-center gap-2">
              {todayDuty.assignedUserPhone && (
                <a
                  href={`tel:${todayDuty.assignedUserPhone}`}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-transform hover:scale-105"
                  title="Call duty member"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{todayDuty.assignedUserPhone}</span>
                </a>
              )}
              <Link
                href="/chat"
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-transform hover:scale-105"
              >
                Chat
              </Link>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <strong>{language === 'bn' ? 'দায়িত্ব:' : 'Duties:'}</strong> {language === 'bn' ? 'টাকা সংগ্রহ, নাস্তা ক্রয় এবং পরিবেশন' : 'Money collection, snacks purchase, delivery'}
            </span>
            {todayDuty.acknowledged ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {language === 'bn' ? 'দায়িত্ব গ্রহণ করেছেন' : 'Acknowledged by member'}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                {language === 'bn' ? 'অপেক্ষমান' : 'Awaiting confirmation'}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 text-center mb-4">
          <Clock className="w-7 h-7 text-amber-500 mx-auto mb-2 opacity-75" />
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {language === 'bn' 
              ? 'আজকের জন্য এখনো কোনো নির্দিষ্ট মেম্বারকে দায়িত্ব অর্পণ করা হয়নি।' 
              : 'No member is assigned for today yet.'}
          </p>
          {isSuperOrAdmin && (
            <Link
              href="/super-admin?tab=duties"
              className="mt-2 inline-block px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              + {language === 'bn' ? 'আজকের দায়িত্ব নির্ধারণ করুন' : 'Assign Duty Now'}
            </Link>
          )}
        </div>
      )}

      {/* Upcoming Rotation Schedule */}
      {!compact && upcomingDuties.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            {language === 'bn' ? 'আসন্ন দায়িত্ব রোস্টার (Upcoming Schedule):' : 'Upcoming Duty Rotation:'}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcomingDuties.map(d => (
              <div
                key={d.id || d.date}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0 text-[11px]">
                    {d.date === todayStr ? 'Today' : d.date.substring(5)}
                  </span>
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {d.assignedUserName}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                  d.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
