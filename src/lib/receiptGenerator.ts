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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || '').split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : ['-'];
}

/**
 * Generates ONE single high-resolution master PNG image containing the ENTIRE orders table,
 * customer details, items, bills, payments, dues, statuses, and grand totals.
 */
export async function downloadFullOrdersTableAsImage(
  orders: OrderData[],
  tabLabel: string = 'Today',
  reportTitle: string = 'Master Orders & Payment Ledger'
): Promise<void> {
  if (!orders || orders.length === 0) return;

  const logicalWidth = 1440;
  const padding = 40;
  const contentWidth = logicalWidth - padding * 2;
  const dpr = 2; // Crisp 2x retina PNG output

  // Pre-measure wrapped item lines for accurate dynamic height calculation
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) throw new Error('Canvas 2D context unavailable');
  mCtx.font = '13px sans-serif';

  const rowLayouts = orders.map((o) => {
    const itemDesc =
      o.itemsText ||
      (o.items && o.items.length > 0
        ? o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
        : 'Catering Order');
    const wrappedItems = wrapTextLines(mCtx, itemDesc, 355);
    const lineCount = Math.max(1, wrappedItems.length);
    const rowHeight = Math.max(58, 28 + lineCount * 18);
    return { order: o, wrappedItems, rowHeight };
  });

  const totalTableRowsHeight = rowLayouts.reduce((s, r) => s + r.rowHeight, 0);
  const headerHeight = 120;
  const kpiHeight = 104;
  const tableHeaderHeight = 46;
  const grandTotalHeight = 56;
  const footerHeight = 70;
  const logicalHeight =
    padding +
    headerHeight +
    20 +
    kpiHeight +
    24 +
    tableHeaderHeight +
    totalTableRowsHeight +
    grandTotalHeight +
    footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.scale(dpr, dpr);

  // 1. Luxury dark canvas backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, logicalWidth, logicalHeight);
  bgGrad.addColorStop(0, '#050811');
  bgGrad.addColorStop(1, '#0b1222');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Outer Frame Border
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 14, 14, logicalWidth - 28, logicalHeight - 28, 20);
  ctx.stroke();

  // Top Accent Bar
  const accentGrad = ctx.createLinearGradient(0, 0, logicalWidth, 0);
  accentGrad.addColorStop(0, '#10b981');
  accentGrad.addColorStop(0.5, '#fbbf24');
  accentGrad.addColorStop(1, '#059669');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(14, 14, logicalWidth - 28, 6);

  // 2. Executive Header
  let curY = padding + 6;
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('SHOPIFY CATERING SERVICE  •  OFFICIAL MASTER LEDGER', padding, curY + 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText(reportTitle, padding, curY + 48);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText(
    'Verified consolidated itemized billing statement, cash collection status & customer balances',
    padding,
    curY + 72
  );

  // Right-side Metadata Card
  const metaW = 340;
  const metaH = 78;
  const metaX = logicalWidth - padding - metaW;
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, metaX, curY + 4, metaW, metaH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`FILTER PERIOD: ${tabLabel.toUpperCase()}`, metaX + 16, curY + 28);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Generated: ${new Date().toLocaleString()}`, metaX + 16, curY + 50);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`Total Records: ${orders.length} Entries`, metaX + 16, curY + 70);

  // 3. Summary KPIs
  curY += headerHeight + 12;
  const totalBill = orders.reduce((s, o) => s + (Number(o.totalBill) || 0), 0);
  const totalPaid = orders.reduce((s, o) => s + (Number(o.paidAmount) || 0), 0);
  const totalDue = orders.reduce((s, o) => s + (o.changeDue < 0 ? Math.abs(o.changeDue) : 0), 0);
  const totalChange = orders.reduce((s, o) => s + (o.changeDue > 0 ? o.changeDue : 0), 0);
  const collRate = totalBill > 0 ? Math.min(100, (totalPaid / totalBill) * 100) : 0;

  const kpiCards = [
    {
      label: 'TOTAL ORDERS',
      value: `${orders.length}`,
      sub: 'Verified Entries',
      color: '#f8fafc',
      border: 'rgba(16, 185, 129, 0.35)',
    },
    {
      label: 'TOTAL BILLED AMOUNT',
      value: `৳${totalBill.toFixed(2)}`,
      sub: 'Combined Catering Bill',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.4)',
    },
    {
      label: 'TOTAL COLLECTED',
      value: `৳${totalPaid.toFixed(2)}`,
      sub: `${collRate.toFixed(1)}% Collection Velocity`,
      color: '#34d399',
      border: 'rgba(16, 185, 129, 0.4)',
    },
    {
      label: totalDue > 0 ? 'OUTSTANDING DUE' : 'REFUNDABLE CHANGE',
      value: totalDue > 0 ? `৳${totalDue.toFixed(2)}` : `৳${totalChange.toFixed(2)}`,
      sub: totalDue > 0 ? 'Pending Recovery' : 'All Accounts Settled',
      color: totalDue > 0 ? '#fb7185' : '#38bdf8',
      border: totalDue > 0 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.35)',
    },
  ];

  const gap = 16;
  const cardW = (contentWidth - gap * 3) / 4;
  kpiCards.forEach((kpi, idx) => {
    const cx = padding + idx * (cardW + gap);
    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, cx, curY, cardW, kpiHeight - 10, 14);
    ctx.fill();
    ctx.strokeStyle = kpi.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(kpi.label, cx + 18, curY + 26);

    ctx.fillStyle = kpi.color;
    ctx.font = 'bold 24px monospace';
    ctx.fillText(kpi.value, cx + 18, curY + 58);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(kpi.sub, cx + 18, curY + 80);
  });

  // 4. Master Table Header
  curY += kpiHeight + 16;
  ctx.fillStyle = '#064e3b';
  drawRoundedRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 10);
  ctx.fill();

  const cols = {
    sl: padding + 16,
    ord: padding + 64,
    customer: padding + 215,
    items: padding + 455,
    bill: padding + 850,
    paid: padding + 980,
    diff: padding + 1110,
    status: padding + 1255,
  };

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('#', cols.sl, curY + 27);
  ctx.fillText('ORDER NO & DATE', cols.ord, curY + 27);
  ctx.fillText('MEMBER / CUSTOMER', cols.customer, curY + 27);
  ctx.fillText('ORDERED ITEMS & QUANTITY', cols.items, curY + 27);
  ctx.fillText('BILL (৳)', cols.bill, curY + 27);
  ctx.fillText('PAID (৳)', cols.paid, curY + 27);
  ctx.fillText('DUE / CHANGE', cols.diff, curY + 27);
  ctx.fillText('STATUS', cols.status, curY + 27);

  curY += tableHeaderHeight + 4;

  // 5. Table Rows
  rowLayouts.forEach((layout, i) => {
    const o = layout.order;
    const rh = layout.rowHeight;

    ctx.fillStyle = i % 2 === 0 ? '#0f172a' : '#131d31';
    ctx.fillRect(padding, curY, contentWidth, rh);

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, curY + rh);
    ctx.lineTo(padding + contentWidth, curY + rh);
    ctx.stroke();

    // SL
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${String(i + 1).padStart(2, '0')}`, cols.sl, curY + 28);

    // Order # & Date
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(o.orderNumber || `ORD-${i + 1}`, cols.ord, curY + 25);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    const dStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString() : '';
    ctx.fillText(`${dStr} • ${o.paymentMethod || 'Cash'}`, cols.ord, curY + 43);

    // Customer & Dept
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    const custName = (o.customerName || 'Member').slice(0, 24);
    ctx.fillText(custName, cols.customer, curY + 25);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText((o.customerDepartment || 'Shopify Member').slice(0, 26), cols.customer, curY + 43);

    // Items wrapped
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    layout.wrappedItems.forEach((line, lIdx) => {
      ctx.fillText(line, cols.items, curY + 25 + lIdx * 18);
    });

    // Bill
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`৳${(Number(o.totalBill) || 0).toFixed(2)}`, cols.bill, curY + 30);

    // Paid
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`৳${(Number(o.paidAmount) || 0).toFixed(2)}`, cols.paid, curY + 30);

    // Diff (Due / Change)
    const diff = Number(o.changeDue) || 0;
    if (diff < 0) {
      ctx.fillStyle = '#fb7185';
      ctx.fillText(`-৳${Math.abs(diff).toFixed(2)} Due`, cols.diff, curY + 30);
    } else if (diff > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`+৳${diff.toFixed(2)} Chg`, cols.diff, curY + 30);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText(`৳0.00`, cols.diff, curY + 30);
    }

    // Status Badge
    const st = (o.status || 'Pending').toUpperCase();
    const badgeColor =
      st === 'PAID'
        ? { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', text: '#34d399' }
        : st === 'DUE'
        ? { bg: 'rgba(244, 63, 94, 0.2)', border: '#f43f5e', text: '#fb7185' }
        : { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fbbf24' };

    ctx.fillStyle = badgeColor.bg;
    drawRoundedRect(ctx, cols.status, curY + 13, 86, 26, 8);
    ctx.fill();
    ctx.strokeStyle = badgeColor.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = badgeColor.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st, cols.status + 43, curY + 30);
    ctx.textAlign = 'left';

    curY += rh;
  });

  // 6. Grand Total Summary Row
  curY += 4;
  ctx.fillStyle = '#064e3b';
  drawRoundedRect(ctx, padding, curY, contentWidth, grandTotalHeight, 12);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText('GRAND TOTAL SUMMARY', padding + 20, curY + 33);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${orders.length} Completed Orders`, cols.items, curY + 33);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`৳${totalBill.toFixed(2)}`, cols.bill, curY + 33);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`৳${totalPaid.toFixed(2)}`, cols.paid, curY + 33);

  ctx.fillStyle = totalDue > 0 ? '#fb7185' : '#38bdf8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(
    totalDue > 0 ? `-৳${totalDue.toFixed(2)} Due` : `+৳${totalChange.toFixed(2)} Chg`,
    cols.diff,
    curY + 33
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${collRate.toFixed(1)}% Paid`, cols.status, curY + 33);

  // 7. Footer Stamp
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    `Shopify Catering Service  •  Master Accounting Table Export (${tabLabel})  •  Confidential Enterprise Record`,
    logicalWidth / 2,
    logicalHeight - 32
  );
  ctx.textAlign = 'left';

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to render master ledger image'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanLabel = (tabLabel || 'Orders').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `Shopify_Master_Orders_Ledger_${cleanLabel}_${dateStr}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      resolve();
    }, 'image/png');
  });
}
