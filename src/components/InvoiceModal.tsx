'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { OrderData } from '@/lib/types';
import { X, Printer, Download, UtensilsCrossed, CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';

interface InvoiceModalProps {
  order: OrderData | null;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const { language } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  // High-Resolution Luxury Order Image Generator & Downloader (HTML5 Canvas)
  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 2x Retina scale for crisp image
      const scale = 2;
      const width = 600 * scale;
      const height = 800 * scale;
      canvas.width = width;
      canvas.height = height;
      ctx.scale(scale, scale);

      // Background Gradient (Dark Luxury Slate)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#06281e');
      bgGrad.addColorStop(1, '#021e16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 600, 800);

      // Gold Border Frame
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 568, 768);

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, 556, 756);

      // Header Banner
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHOPIFY CATERING SERVICE', 300, 70);

      ctx.fillStyle = '#6ee7b7';
      ctx.font = '12px sans-serif';
      ctx.fillText('Luxury Corporate Catering & Daily Refreshment Tracker', 300, 95);

      // Divider line
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(40, 115);
      ctx.lineTo(560, 115);
      ctx.stroke();
      ctx.setLineDash([]);

      // Order Metadata
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Order Number:', 50, 150);
      ctx.fillText('Customer Name:', 50, 180);
      ctx.fillText('Date & Time:', 50, 210);
      ctx.fillText('Payment Method:', 50, 240);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(order.orderNumber, 550, 150);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(order.customerName, 550, 180);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px sans-serif';
      ctx.fillText(new Date(order.orderDate).toLocaleString(), 550, 210);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(order.paymentMethod, 550, 240);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(40, 265);
      ctx.lineTo(560, 265);
      ctx.stroke();

      // Items Section Title
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ORDER ITEMS / খাবারের বিবরণ', 50, 295);

      // Line items
      let startY = 330;
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          ctx.fillStyle = '#f1f5f9';
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${item.quantity} × ${item.name}`, 50, startY);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(`৳${item.subtotal.toFixed(2)}`, 550, startY);
          startY += 30;
        });
      } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '13px sans-serif';
        ctx.fillText(order.itemsText || 'General Catering Items', 50, startY);
        startY += 35;
      }

      // Financial Calculation Block
      const calcY = Math.max(startY + 20, 480);
      ctx.fillStyle = 'rgba(6, 78, 59, 0.4)';
      ctx.fillRect(40, calcY, 520, 150);
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, calcY, 520, 150);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px sans-serif';
      ctx.fillText('Total Bill (মোট বিল):', 60, calcY + 40);
      ctx.fillText('Cash Received (মোট জমা):', 60, calcY + 80);
      ctx.fillText('Change Returned (ফেরত বাকি):', 60, calcY + 120);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`৳${Number(order.totalBill).toFixed(2)}`, 530, calcY + 40);

      ctx.fillStyle = '#5eead4';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`৳${Number(order.paidAmount).toFixed(2)}`, 530, calcY + 80);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`৳${Math.max(0, Number(order.changeDue)).toFixed(2)}`, 530, calcY + 120);

      // Verified Stamp
      ctx.textAlign = 'center';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`● STATUS: ${order.status.toUpperCase()} ● VERIFIED DIGITAL RECEIPT ●`, 300, 680);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.fillText('Generated by Shopify Catering Service System • Dhaka, Bangladesh', 300, 720);

      // Trigger instant PNG Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Shopify_Catering_Order_${order.orderNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert('Could not generate image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-emerald-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Printable Area */}
        <div id="printable-invoice" className="p-6 bg-slate-950 text-slate-100 font-sans">
          
          {/* Receipt Top Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-800">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-950 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold tracking-tight text-amber-200">
              Shopify Catering Service
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium">
              Luxury Corporate Catering & Daily Refreshment
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Dhaka, Bangladesh • Hotline: +880 1700-000000
            </p>
          </div>

          {/* Receipt Meta */}
          <div className="py-3 border-b border-dashed border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">{language === 'bn' ? 'অর্ডার নম্বর:' : 'Order ID:'}</span>
              <span className="font-mono font-bold text-white">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{language === 'bn' ? 'গ্রাহকের নাম:' : 'Customer:'}</span>
              <span className="font-semibold text-amber-300">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{language === 'bn' ? 'তারিখ ও সময়:' : 'Date & Time:'}</span>
              <span className="text-slate-300">
                {new Date(order.orderDate).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{language === 'bn' ? 'পেমেন্ট মেথড:' : 'Payment Mode:'}</span>
              <span className="text-slate-300 font-medium">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Itemized Order Details */}
          <div className="py-3 border-b border-dashed border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {language === 'bn' ? 'খাবারের বিবরণ' : 'Order Description'}
            </p>
            
            {order.items && order.items.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-slate-200">
                      {item.quantity} × {item.name}
                    </span>
                    <span className="font-mono text-slate-300">
                      ৳{item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-300 font-medium bg-slate-900 p-2.5 rounded-xl">
                {order.itemsText || (language === 'bn' ? 'সাধারণ ক্যাটারিং মেনু' : 'General Catering Order')}
              </p>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="py-3 border-b border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-300">{language === 'bn' ? 'মোট বিল (Total Bill):' : 'Total Bill:'}</span>
              <span className="font-mono text-amber-300 font-bold">
                ৳{Number(order.totalBill).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{language === 'bn' ? 'জমা দিয়েছেন (Paid):' : 'Cash Received:'}</span>
              <span className="font-mono text-teal-300 font-bold">
                ৳{Number(order.paidAmount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>{language === 'bn' ? 'ফেরত দেওয়া হয়েছে (Change):' : 'Change Returned:'}</span>
              <span className="font-mono text-sm">
                ৳{Math.max(0, Number(order.changeDue)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Status Badge & Stamp */}
          <div className="pt-4 text-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-600/80 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{order.status} • {language === 'bn' ? 'পরিশোধিত' : 'Verified'}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Bar with Image Download */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
          
          <div className="flex items-center gap-2">
            {/* Download Order Image Button */}
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
            >
              {downloading ? (
                <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? 'Generating PNG...' : (language === 'bn' ? 'ইমেজ ডাউনলোড (PNG)' : 'Download Image (PNG)')}</span>
            </button>

            {/* Print Receipt Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
