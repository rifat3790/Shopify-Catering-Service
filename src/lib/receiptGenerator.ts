import JSZip from 'jszip';
import { OrderData } from './types';

/**
 * Generates high-resolution PNG receipt blob on HTML5 Canvas
 */
export function generateReceiptBlob(order: OrderData): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const width = 800;
      const padding = 40;
      const items = order.items && order.items.length > 0
        ? order.items
        : [{ name: order.itemsText || 'Catering Order', quantity: 1, unitPrice: order.totalBill, subtotal: order.totalBill }];

      const estimatedHeight = Math.max(580, 520 + (items.length * 36));
      canvas.width = width;
      canvas.height = estimatedHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas context not available'));
      }

      // Background gradient: Dark luxury slate
      const bgGrad = ctx.createLinearGradient(0, 0, width, estimatedHeight);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, estimatedHeight);

      // Border & Gold Accent Top
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, width - 30, estimatedHeight - 30);

      const goldGrad = ctx.createLinearGradient(0, 0, width, 0);
      goldGrad.addColorStop(0, '#059669');
      goldGrad.addColorStop(0.5, '#fbbf24');
      goldGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = goldGrad;
      ctx.fillRect(15, 15, width - 30, 8);

      // Brand Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px serif';
      ctx.fillText('Shopify Catering Service', padding, 65);

      ctx.fillStyle = '#34d399';
      ctx.font = '12px sans-serif';
      ctx.fillText('Official Catering Receipt & Enterprise Invoice', padding, 85);

      // Order Info
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`Order No: ${order.orderNumber}`, padding, 120);
      ctx.fillText(`Date: ${new Date(order.orderDate).toLocaleString()}`, padding, 140);
      ctx.fillText(`Payment: ${order.paymentMethod}`, padding, 160);

      // Customer Info Box
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width - 320, 100, 280, 75);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - 320, 100, 280, 75);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.fillText('CUSTOMER / BILLED TO:', width - 305, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(order.customerName, width - 305, 140);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText(order.customerDepartment || 'Shopify Team', width - 305, 160);

      // Items Table Header
      let y = 205;
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(padding, y, width - (padding * 2), 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ITEM DESCRIPTION', padding + 15, y + 21);
      ctx.fillText('QTY', width - 280, y + 21);
      ctx.fillText('RATE', width - 190, y + 21);
      ctx.fillText('TOTAL', width - 100, y + 21);

      // Items Rows
      y += 45;
      ctx.font = '13px sans-serif';
      items.forEach((item, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(padding, y - 15, width - (padding * 2), 28);

        ctx.fillStyle = '#f8fafc';
        ctx.fillText(item.name, padding + 15, y + 4);
        ctx.fillText(`${item.quantity}`, width - 275, y + 4);
        ctx.fillText(`৳${item.unitPrice.toFixed(2)}`, width - 190, y + 4);
        ctx.fillText(`৳${item.subtotal.toFixed(2)}`, width - 100, y + 4);
        y += 32;
      });

      // Totals Section
      y += 15;
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      y += 25;
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Total Bill Amount:', width - 280, y);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`৳${order.totalBill.toFixed(2)}`, width - 120, y);

      y += 25;
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Amount Paid:', width - 280, y);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`৳${order.paidAmount.toFixed(2)}`, width - 120, y);

      y += 25;
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(order.changeDue >= 0 ? 'Change Returned:' : 'Balance Due:', width - 280, y);
      ctx.font = '14px monospace';
      ctx.fillStyle = order.changeDue >= 0 ? '#38bdf8' : '#f87171';
      ctx.fillText(`৳${Math.abs(order.changeDue).toFixed(2)}`, width - 120, y);

      // Status Stamp
      ctx.save();
      ctx.translate(padding + 90, y - 20);
      ctx.rotate(-0.12);
      ctx.strokeStyle = order.status === 'Paid' ? '#10b981' : (order.status === 'Due' ? '#f43f5e' : '#f59e0b');
      ctx.lineWidth = 3;
      ctx.strokeRect(-65, -22, 130, 44);
      ctx.fillStyle = order.status === 'Paid' ? '#10b981' : (order.status === 'Due' ? '#f43f5e' : '#f59e0b');
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(order.status.toUpperCase(), 0, 7);
      ctx.restore();

      // Footer
      ctx.textAlign = 'center';
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Thank you for catering with Shopify Catering Service • Verified Digital Invoice', width / 2, estimatedHeight - 30);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Downloads a single order receipt as PNG
 */
export async function downloadReceiptPng(order: OrderData): Promise<void> {
  const blob = await generateReceiptBlob(order);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `receipt-${order.orderNumber}.png`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Downloads all orders in the current active tab as a ZIP file containing high-resolution PNG receipts
 */
export async function downloadOrdersAsZip(
  orders: OrderData[],
  tabLabel: string = 'All',
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (!orders || orders.length === 0) return;

  const zip = new JSZip();
  const folderName = `Shopify-Invoices-${tabLabel}`;
  const folder = zip.folder(folderName) || zip;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    try {
      const blob = await generateReceiptBlob(o);
      const cleanCustomer = (o.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Receipt_${o.orderNumber}_${cleanCustomer}.png`;
      folder.file(filename, blob);
    } catch (err) {
      console.warn(`Failed to generate receipt for ${o.orderNumber}:`, err);
    }
    if (onProgress) {
      onProgress(i + 1, orders.length);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Shopify_Catering_Invoices_${tabLabel}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
