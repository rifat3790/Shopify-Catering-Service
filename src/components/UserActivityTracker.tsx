'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function getDeviceDescription(): string {
  if (typeof window === 'undefined') return 'Server';
  const ua = navigator.userAgent;
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edg/i.test(ua)) browser = 'Edge';

  return `${device} (${os} - ${browser})`;
}

const PAGE_TITLE_MAP: Record<string, string> = {
  '/': 'Home / Welcome',
  '/orders': 'Orders & Refreshments',
  '/menu': 'Digital Refreshment Menu',
  '/chat': 'Live Team & Voice Chat',
  '/tracker': 'Daily Ledger & Payment Tracker',
  '/members': 'Team Directory & Balances',
  '/user': 'My Personal Catering Hub',
  '/pos': 'Express Counter POS',
  '/super-admin': 'Super Admin Command Center',
  '/admin': 'Admin Kitchen Portal',
  '/login': 'Member Login',
  '/signup': 'Account Registration',
};

export default function UserActivityTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastLoggedPath = useRef<string>('');
  const lastLoggedTime = useRef<number>(0);

  useEffect(() => {
    if (!pathname) return;
    const now = Date.now();
    // Debounce duplicate logs for the same route within 8 seconds
    if (lastLoggedPath.current === pathname && (now - lastLoggedTime.current < 8000)) {
      return;
    }

    lastLoggedPath.current = pathname;
    lastLoggedTime.current = now;

    const pageTitle = PAGE_TITLE_MAP[pathname] || `Page ${pathname}`;
    const device = getDeviceDescription();

    const payload = {
      userId: user?.uid || user?.email || 'anonymous',
      userName: user?.displayName || user?.name || user?.email?.split('@')[0] || 'Visitor',
      userEmail: user?.email || '',
      userAvatar: user?.photoURL || user?.avatar || '',
      userRole: user?.role || 'user',
      path: pathname,
      pageTitle,
      action: 'page_view',
      details: `Visited ${pageTitle}`,
      device,
    };

    fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [pathname, user]);

  return null;
}
