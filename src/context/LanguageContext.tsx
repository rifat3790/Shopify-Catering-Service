'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'bn' | 'en';

interface Translations {
  [key: string]: {
    en: string;
    bn: string;
  };
}

const translations: Translations = {
  appName: {
    en: "Shopify Catering Service",
    bn: "শপিফাই ক্যাটারিং সার্ভিস",
  },
  trackerTitle: {
    en: "Shopify Catering Service — Order & Payment Tracker",
    bn: "শপিফাই ক্যাটারিং সার্ভিস — দৈনিক খাবার ও রিফ্রেশমেন্ট অর্ডার ট্র্যাকার",
  },
  trackerSubtitle: {
    en: "Daily Food & Refreshment Order Tracker — Real-Time Bill & Collection Status",
    bn: "দৈনিক খাবার ও রিফ্রেশমেন্ট অর্ডার ট্র্যাকার - রিয়েল-টাইম বিল ও কালেকশন স্ট্যাটাস",
  },
  ordersCount: {
    en: "Orders Count",
    bn: "অর্ডারের সংখ্যা",
  },
  totalBill: {
    en: "Total Bill",
    bn: "মোট বিল",
  },
  totalPaid: {
    en: "Total Paid",
    bn: "মোট জমা",
  },
  refundChange: {
    en: "Refundable / Change",
    bn: "ফেরতযোগ্য / বকেয়া",
  },
  collectionRate: {
    en: "Collection Rate",
    bn: "আদায়ের হার",
  },
  customerName: {
    en: "Customer Name",
    bn: "গ্রাহকের নাম",
  },
  orderedItems: {
    en: "Ordered Items",
    bn: "খাবারের বিবরণ",
  },
  billTk: {
    en: "Bill (৳)",
    bn: "মোট বিল (৳)",
  },
  paidTk: {
    en: "Paid (৳)",
    bn: "পরিশোধ (Paid ৳)",
  },
  changeDueTk: {
    en: "Change / Due (৳)",
    bn: "ফেরত / বকেয়া (Change ৳)",
  },
  status: {
    en: "Status",
    bn: "স্ট্যাটাস",
  },
  actions: {
    en: "Actions",
    bn: "অ্যাকশন",
  },
  newOrder: {
    en: "Add New Order",
    bn: "নতুন অর্ডার যুক্ত করুন",
  },
  filterStatus: {
    en: "Filter by Status",
    bn: "স্ট্যাটাস ফিল্টার",
  },
  searchPlaceholder: {
    en: "Search customer or food items...",
    bn: "গ্রাহক বা খাবারের নাম খুঁজুন...",
  },
  exportCsv: {
    en: "Export Sheet",
    bn: "শিট এক্সপোর্ট",
  },
  menuTitle: {
    en: "Luxury Catering Menu",
    bn: "লাক্সারি ক্যাটারিং মেনু",
  },
  posTitle: {
    en: "Counter POS Express",
    bn: "কাউন্টার পয়েন্ট অব সেল",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: () => '',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('bn');

  useEffect(() => {
    const saved = localStorage.getItem('shopify_lang') as Language;
    if (saved === 'en' || saved === 'bn') {
      setLanguage(saved);
    }
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'bn' ? 'en' : 'bn';
      localStorage.setItem('shopify_lang', next);
      return next;
    });
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('shopify_lang', lang);
  };

  const t = (key: keyof typeof translations): string => {
    if (!translations[key]) return String(key);
    return translations[key][language] || translations[key]['en'];
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
