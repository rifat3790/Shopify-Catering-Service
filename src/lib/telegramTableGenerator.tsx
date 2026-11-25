import React from 'react';
import { ImageResponse } from 'next/og';
import { OrderData } from './types';

function safeAscii(str: string | undefined | null, fallback = '-'): string {
  if (!str) return fallback;
  // Normalize Taka symbol and strip characters that could miss default Satori Latin fonts
  const replaced = String(str)
    .replace(/৳/g, 'Tk ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return replaced || fallback;
}

export async function generateOrdersTablePngBuffer(
  orders: OrderData[],
  dateLabel: string,
  title: string = 'Daily Orders & Payment Ledger'
): Promise<Buffer> {
  const displayOrders = (orders || []).slice(0, 45);
  const totalCount = orders?.length || 0;
  const totalBill = (orders || []).reduce((s, o) => s + (Number(o.totalBill) || 0), 0);
  const totalPaid = (orders || []).reduce((s, o) => s + (Number(o.paidAmount) || 0), 0);
  const totalDue = (orders || []).reduce((s, o) => s + (o.changeDue < 0 ? Math.abs(o.changeDue) : 0), 0);
  const totalChange = (orders || []).reduce((s, o) => s + (o.changeDue > 0 ? o.changeDue : 0), 0);
  const collRate = totalBill > 0 ? Math.min(100, (totalPaid / totalBill) * 100) : 0;

  const width = 1180;
  const rowH = 44;
  const height = Math.max(480, 320 + Math.max(1, displayOrders.length) * rowH + 100);

  const img = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#050811',
          color: '#f8fafc',
          padding: '28px 34px',
          fontFamily: 'sans-serif',
          border: '3px solid #10b981',
        }}
      >
        {/* Top Accent Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #1e293b',
            paddingBottom: '16px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#34d399',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              SHOPIFY CATERING SERVICE  •  AUTOMATED TELEGRAM REPORT
            </span>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#ffffff',
                marginTop: '4px',
              }}
            >
              {safeAscii(title)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              backgroundColor: '#0f172a',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '10px 16px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
              DATE: {safeAscii(dateLabel)}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
              TOTAL ORDERS: {totalCount}
            </span>
          </div>
        </div>

        {/* 4 Summary KPI Boxes */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '14px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '12px 16px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>TOTAL ORDERS</span>
            <span style={{ fontSize: '24px', color: '#ffffff', fontWeight: 800, marginTop: '4px' }}>
              {totalCount}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '12px 16px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>TOTAL BILL</span>
            <span style={{ fontSize: '24px', color: '#fbbf24', fontWeight: 800, marginTop: '4px' }}>
              Tk {totalBill.toFixed(2)}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              border: '1px solid #10b981',
              borderRadius: '12px',
              padding: '12px 16px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>TOTAL COLLECTED</span>
            <span style={{ fontSize: '24px', color: '#34d399', fontWeight: 800, marginTop: '4px' }}>
              Tk {totalPaid.toFixed(2)}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              border: totalDue > 0 ? '1px solid #f43f5e' : '1px solid #38bdf8',
              borderRadius: '12px',
              padding: '12px 16px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: totalDue > 0 ? '#fb7185' : '#38bdf8',
                fontWeight: 700,
              }}
            >
              {totalDue > 0 ? 'TOTAL DUE' : 'CHANGE / SETTLED'}
            </span>
            <span
              style={{
                fontSize: '24px',
                color: totalDue > 0 ? '#fb7185' : '#38bdf8',
                fontWeight: 800,
                marginTop: '4px',
              }}
            >
              Tk {(totalDue > 0 ? totalDue : totalChange).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Table Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: '#064e3b',
            borderRadius: '10px 10px 0 0',
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#a7f3d0',
          }}
        >
          <span style={{ width: '40px' }}>#</span>
          <span style={{ width: '120px' }}>ORDER NO</span>
          <span style={{ width: '210px' }}>CUSTOMER</span>
          <span style={{ flex: 1 }}>ORDERED ITEMS</span>
          <span style={{ width: '110px', textAlign: 'right' }}>BILL</span>
          <span style={{ width: '110px', textAlign: 'right' }}>PAID</span>
          <span style={{ width: '110px', textAlign: 'right' }}>DUE/CHG</span>
          <span style={{ width: '95px', textAlign: 'center' }}>STATUS</span>
        </div>

        {/* Rows Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #1e293b',
            borderTop: 'none',
          }}
        >
          {displayOrders.length === 0 ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '36px',
                backgroundColor: '#0f172a',
                color: '#94a3b8',
                fontSize: '15px',
              }}
            >
              No orders recorded for this date.
            </div>
          ) : (
            displayOrders.map((o, idx) => {
              const itemsDesc = safeAscii(
                o.itemsText ||
                  (o.items && o.items.length > 0
                    ? o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                    : 'Catering Order')
              ).slice(0, 46);
              const diff = Number(o.changeDue) || 0;
              const statusStr = (o.status || 'Pending').toUpperCase();
              const statusBg =
                statusStr === 'PAID' ? '#065f46' : statusStr === 'DUE' ? '#881337' : '#78350f';
              const statusColor =
                statusStr === 'PAID' ? '#34d399' : statusStr === 'DUE' ? '#fda4af' : '#fcd34d';

              return (
                <div
                  key={o._id || o.orderNumber || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: idx % 2 === 0 ? '#0f172a' : '#131d31',
                    borderBottom: '1px solid #1e293b',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ width: '40px', color: '#64748b', fontWeight: 700 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{ width: '120px', color: '#fbbf24', fontWeight: 700 }}>
                    {safeAscii(o.orderNumber, `ORD-${idx + 1}`)}
                  </span>
                  <span style={{ width: '210px', color: '#f8fafc', fontWeight: 600 }}>
                    {safeAscii(o.customerName, 'Member').slice(0, 22)}
                  </span>
                  <span style={{ flex: 1, color: '#cbd5e1' }}>{itemsDesc}</span>
                  <span style={{ width: '110px', textAlign: 'right', color: '#fbbf24', fontWeight: 700 }}>
                    Tk {(Number(o.totalBill) || 0).toFixed(0)}
                  </span>
                  <span style={{ width: '110px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                    Tk {(Number(o.paidAmount) || 0).toFixed(0)}
                  </span>
                  <span
                    style={{
                      width: '110px',
                      textAlign: 'right',
                      color: diff < 0 ? '#fb7185' : diff > 0 ? '#38bdf8' : '#64748b',
                      fontWeight: 700,
                    }}
                  >
                    {diff < 0
                      ? `-Tk ${Math.abs(diff).toFixed(0)}`
                      : diff > 0
                      ? `+Tk ${diff.toFixed(0)}`
                      : '0'}
                  </span>
                  <div
                    style={{
                      width: '95px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: statusBg,
                        color: statusColor,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {statusStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Grand Totals Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#064e3b',
            borderRadius: '0 0 10px 10px',
            padding: '12px 14px',
            fontSize: '14px',
            fontWeight: 800,
          }}
        >
          <span style={{ width: '370px', color: '#fbbf24' }}>GRAND TOTAL SUMMARY</span>
          <span style={{ flex: 1, color: '#a7f3d0' }}>{totalCount} Orders ({collRate.toFixed(0)}% Collected)</span>
          <span style={{ width: '110px', textAlign: 'right', color: '#fbbf24' }}>
            Tk {totalBill.toFixed(0)}
          </span>
          <span style={{ width: '110px', textAlign: 'right', color: '#34d399' }}>
            Tk {totalPaid.toFixed(0)}
          </span>
          <span
            style={{
              width: '110px',
              textAlign: 'right',
              color: totalDue > 0 ? '#fb7185' : '#38bdf8',
            }}
          >
            {totalDue > 0 ? `-Tk ${totalDue.toFixed(0)}` : `+Tk ${totalChange.toFixed(0)}`}
          </span>
          <span style={{ width: '95px', textAlign: 'center', color: '#ffffff' }}>CLOSED</span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: '14px',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          <span>Shopify Catering Service  •  https://shopify-catering-service.vercel.app/</span>
          <span>Automated Enterprise Ledger Snapshot</span>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );

  const arrayBuffer = await img.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
