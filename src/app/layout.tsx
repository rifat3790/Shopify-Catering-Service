import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ToastProvider } from '@/context/ToastContext';
import GlobalCallManager from '@/components/GlobalCallManager';

export const metadata: Metadata = {
  title: 'Shopify Catering Service — Order & Payment Tracker',
  description: 'Shopify catering and refreshment ordering system with real-time bill and collection ledger.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              <GlobalCallManager />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

