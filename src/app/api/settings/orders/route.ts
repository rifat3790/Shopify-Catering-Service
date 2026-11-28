import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import { connectToDatabase } from '@/lib/mongodb';
import Setting from '@/lib/models/Setting';
import { sendOrderClosedAndTableReport, getBangladeshTimeInfo } from '@/lib/telegramService';
import { OrderControlData, DEFAULT_ORDER_CONTROL, evaluateOrderAllowed } from '@/lib/orderControl';

const DEFAULT_SETTINGS = DEFAULT_ORDER_CONTROL;

export async function GET() {
  try {
    await connectToDatabase();
    let currentSettings = DEFAULT_SETTINGS;

    if (Setting) {
      const doc = await Setting.findOne({ key: 'order_control' }).lean();
      if (doc && doc.value) {
        currentSettings = { ...DEFAULT_SETTINGS, ...doc.value };
      }
    }

    const evaluation = evaluateOrderAllowed(currentSettings);
    const displayTime = evaluation.cutoffTime || currentSettings.dailyCutoffTime || '09:20 AM';
    const dynamicNoticeEn =
      !currentSettings.noticeMessageEn ||
      currentSettings.noticeMessageEn.includes('09:20 AM') ||
      currentSettings.noticeMessageEn.startsWith('Catering orders must be placed by')
        ? `Catering orders must be placed by ${displayTime} daily.`
        : currentSettings.noticeMessageEn;

    // Telegram automations run from the server-side scheduler (/api/telegram/automate), not inside user polls.

    return NextResponse.json({
      success: true,
      data: {
        ...currentSettings,
        noticeMessageEn: dynamicNoticeEn,
        evaluation,
        isOrderAllowedNow: evaluation.allowed,
      }
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (error: any) {
    console.error('API /settings/orders GET error:', error);
    const evaluation = evaluateOrderAllowed(DEFAULT_SETTINGS);
    return NextResponse.json({
      success: true,
      data: {
        ...DEFAULT_SETTINGS,
        evaluation,
        isOrderAllowedNow: evaluation.allowed,
      }
    });
  }
}

export async function POST(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const body = await request.json();
    const { ordersEnabled, dailyCutoffTime, cutoffEnabled, noticeMessageBn, noticeMessageEn } = body;

    await connectToDatabase();

    const newSettings: OrderControlData = {
      ordersEnabled: ordersEnabled !== undefined ? Boolean(ordersEnabled) : true,
      dailyCutoffTime: dailyCutoffTime || '09:20',
      cutoffEnabled: cutoffEnabled !== undefined ? Boolean(cutoffEnabled) : true,
      noticeMessageBn: noticeMessageBn || DEFAULT_SETTINGS.noticeMessageBn,
      noticeMessageEn: noticeMessageEn || DEFAULT_SETTINGS.noticeMessageEn,
    };

    const newEval = evaluateOrderAllowed(newSettings);
    const displayTime = newEval.cutoffTime || newSettings.dailyCutoffTime || '09:20 AM';
    if (
      !newSettings.noticeMessageEn ||
      newSettings.noticeMessageEn.includes('09:20 AM') ||
      newSettings.noticeMessageEn.startsWith('Catering orders must be placed by')
    ) {
      newSettings.noticeMessageEn = `Catering orders must be placed by ${displayTime} daily.`;
    }

    if (Setting) {
      const prevDoc = await Setting.findOne({ key: 'order_control' }).lean();
      const prevSettings: OrderControlData = (prevDoc as any)?.value
        ? { ...DEFAULT_SETTINGS, ...(prevDoc as any).value }
        : DEFAULT_SETTINGS;
      const wasAllowed = evaluateOrderAllowed(prevSettings).allowed;
      const isNowAllowed = newEval.allowed;

      await Setting.findOneAndUpdate(
        { key: 'order_control' },
        { value: newSettings },
        { upsert: true, new: true }
      );

      const { todayStr } = getBangladeshTimeInfo();

      // If orders JUST CLOSED (either manually disabled OR dailyCutoffTime changed so it's now past cutoff!),
      // IMMEDIATELY await sending Telegram Closed notification + today's full Order Table PNG!
      if (wasAllowed && !isNowAllowed) {
        // Atomic claim so a concurrent scheduler run cannot send the same report twice
        const claimed = await Setting.findOneAndUpdate(
          { key: 'telegram_settings', 'value.lastCutoffReportDate': { $ne: todayStr } },
          { $set: { 'value.lastCutoffReportDate': todayStr } },
          { new: true }
        ).catch(() => null);
        if (claimed) {
          await sendOrderClosedAndTableReport(false, todayStr).catch((err) =>
            console.warn('Telegram close alert warning:', err)
          );
        }
      } else if (!wasAllowed && isNowAllowed) {
        // Re-opened orders for today: clear cutoff lock so closing again later triggers fresh Telegram report
        await Setting.findOneAndUpdate(
          { key: 'telegram_settings' },
          { $set: { 'value.lastCutoffReportDate': '' } }
        ).catch(() => {});
      }
    }

    const evaluation = newEval;

    return NextResponse.json({
      success: true,
      data: {
        ...newSettings,
        evaluation,
        isOrderAllowedNow: evaluation.allowed,
      },
      message: 'Order settings updated successfully in database'
    });
  } catch (error: any) {
    console.error('API /settings/orders POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order settings' },
      { status: 500 }
    );
  }
}
