import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ToastProvider } from '@/context/ToastContext';
import GlobalCallManager from '@/components/GlobalCallManager';
import ThemeSelectorModal from '@/components/ThemeSelectorModal';
import OrderCutoffTicker from '@/components/OrderCutoffTicker';
import UserActivityTracker from '@/components/UserActivityTracker';
import DailyDutyNotificationDialog from '@/components/DailyDutyNotificationDialog';

export const metadata: Metadata = {
  title: 'Shopify Catering Service — Order & Payment Tracker',
  description: 'Shopify catering and refreshment ordering system with real-time bill and collection ledger.',
  icons: {
    icon: [
      { url: '/icon', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://ui-avatars.com" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ToastProvider>
                <GlobalCallManager />
                <ThemeSelectorModal />
                <OrderCutoffTicker />
                <UserActivityTracker />
                <DailyDutyNotificationDialog />
                <div className="flex-1 flex flex-col">
                  {children}
                </div>
              </ToastProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

