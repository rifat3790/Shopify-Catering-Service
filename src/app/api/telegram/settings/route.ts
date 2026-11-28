import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import {
  getTelegramSettings,
  saveTelegramSettings,
  testTelegramBotToken,
  sendMorningOrderReminder,
  sendTelegramDutyNotification,
  sendOrderClosedAndTableReport,
  getBangladeshTimeInfo,
} from '@/lib/telegramService';
import { getDailyDutyForDate } from '@/lib/dataStore';

export async function GET(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const settings = await getTelegramSettings();
    return NextResponse.json(
      { success: true, data: settings },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch Telegram settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const body = await request.json();
    const { actionType, settings } = body;

    // 1. Save Configuration
    if (actionType === 'save' || (!actionType && settings)) {
      const saved = await saveTelegramSettings(settings || body);
      return NextResponse.json({
        success: true,
        data: saved,
        message: 'Telegram bot configuration saved cleanly.',
      });
    }

    // 2. Test Bot Token Connectivity
    if (actionType === 'test_connection') {
      const current = await getTelegramSettings();
      const tokenToTest = body.botToken || current.botToken;
      const result = await testTelegramBotToken(tokenToTest);
      return NextResponse.json({
        success: Boolean(result.ok),
        bot: result.result,
        error: result.description,
      });
    }

    // 3. Send Test Morning @everyone Reminder Alert
    if (actionType === 'test_morning') {
      const res = await sendMorningOrderReminder(body.cutoffDisplay || '09:20 AM', true);
      return NextResponse.json({
        success: res.sentCount > 0,
        sentCount: res.sentCount,
        errors: res.errors,
        message:
          res.sentCount > 0
            ? `Morning alert sent to ${res.sentCount} group(s)!`
            : `Failed to send: ${res.errors.join(', ')}`,
      });
    }

    // 4. Send Test Daily Responsibility Alert
    if (actionType === 'test_duty') {
      const { todayStr } = getBangladeshTimeInfo();
      const existingDuty = await getDailyDutyForDate(todayStr).catch(() => null);
      const sampleDuty = existingDuty || {
        id: 'test-duty',
        date: todayStr,
        assignedUserId: 'sample',
        assignedUserName: body.sampleName || ((__auth as any).email || 'admin').split('@')[0],
        assignedUserEmail: (__auth as any).email || '',
        assignedByName: 'Super Admin',
        instructions: 'Collect payments, purchase fresh snacks & deliver refreshments to team.',
        status: 'assigned' as const,
        tasks: ['Cash / Payment Collection', 'Snack & Refreshment Purchase', 'Timely Team Delivery'],
        createdAt: new Date().toISOString(),
      };
      const res = await sendTelegramDutyNotification(sampleDuty, true);
      return NextResponse.json({
        success: res.sentCount > 0,
        sentCount: res.sentCount,
        errors: res.errors,
        message:
          res.sentCount > 0
            ? `Duty notification sent to ${res.sentCount} group(s)!`
            : `Failed to send: ${res.errors.join(', ')}`,
      });
    }

    // 5. Send Order Closed + Live Master Table Image Report Now
    if (actionType === 'test_cutoff_report' || actionType === 'send_table_now') {
      const res = await sendOrderClosedAndTableReport(actionType === 'test_cutoff_report', body.date);
      return NextResponse.json({
        success: res.sentCount > 0,
        sentCount: res.sentCount,
        ordersCount: res.ordersCount,
        errors: res.errors,
        message:
          res.sentCount > 0
            ? `Order summary & table image (${res.ordersCount} orders) posted to ${res.sentCount} group(s)!`
            : `Failed to send: ${res.errors.join(', ')}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported Telegram actionType' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Telegram API action failed' },
      { status: 500 }
    );
  }
}
