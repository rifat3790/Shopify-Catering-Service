'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { UtensilsCrossed, Heart, Shield, Database, Flame, Sparkles } from 'lucide-react';

export default function Footer() {
  const { language } = useLanguage();

  return (
    <footer className="mt-20 border-t border-emerald-950 bg-slate-950 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-900/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-serif text-lg font-bold text-white tracking-tight">
                Shopify Catering
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {language === 'bn'
                ? 'প্রিমিয়াম কোয়ালিটি ক্যাটারিং সার্ভিস এবং রিয়েল-টাইম ফুড ও রিফ্রেশমেন্ট অর্ডার ট্র্যাকিং সিস্টেম।'
                : 'Luxury corporate catering and real-time food & refreshment order tracking system.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              {language === 'bn' ? 'মডিউলসমূহ' : 'Modules'}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/tracker" className="hover:text-amber-300 transition-colors">
                  {language === 'bn' ? 'অর্ডার ও পেমেন্ট ট্র্যাকার' : 'Live Order Tracker'}
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-amber-300 transition-colors">
                  {language === 'bn' ? 'ক্যাটারিং মেনু ক্যাটালগ' : 'Digital Menu Catalog'}
                </Link>
              </li>
              <li>
                <Link href="/pos" className="hover:text-amber-300 transition-colors">
                  {language === 'bn' ? 'কাউন্টার ক্যাশিয়ার পিওএস' : 'Cashier Counter POS'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture Badges */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              {language === 'bn' ? 'টেক আর্কিটেকচার' : 'Architecture'}
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-emerald-300">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>MongoDB Atlas (Cluster0)</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Firebase Auth & Admin SDK</span>
              </div>
              <div className="flex items-center gap-2 text-sky-300">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Next.js 15 & Tailwind CSS</span>
              </div>
            </div>
          </div>

          {/* Contact / Service Hours */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              {language === 'bn' ? 'ক্যাটারিং সাপোর্ট' : 'Catering Support'}
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              {language === 'bn' ? 'দৈনিক সকাল ৯:০০ টা - রাত ৯:০০ টা' : 'Daily 9:00 AM - 9:00 PM'}
            </p>
            <p className="text-emerald-400 text-xs mt-1">support@shopifycatering.com</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Shopify Catering Service. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with luxury standards & production-grade engineering
          </p>
        </div>
      </div>
    </footer>
  );
}

