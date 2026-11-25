import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Setting from '@/lib/models/Setting';
import { SUPER_ADMIN_EMAIL } from '@/lib/dataStore';
import { sendOrderClosedAndTableReport, getBangladeshTimeInfo, checkAndRunTelegramAutomations } from '@/lib/telegramService';

export interface OrderControlData {
  ordersEnabled: boolean;
  dailyCutoffTime: string; // "HH:mm" in 24hr format, e.g. "09:20"
  cutoffEnabled: boolean;
  noticeMessageBn?: string;
  noticeMessageEn?: string;
}

const DEFAULT_SETTINGS: OrderControlData = {
  ordersEnabled: true,
  dailyCutoffTime: '09:20',
  cutoffEnabled: true,
  noticeMessageBn: 'প্রতিদিন সকাল ৯:২০ এর মধ্যে খাবার অর্ডার করতে হবে। এরপর অর্ডার স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।',
  noticeMessageEn: 'Catering orders must be placed by 09:20 AM daily.',
};

function evaluateOrderAllowed(settings: OrderControlData) {
  if (!settings.ordersEnabled) {
    return {
      allowed: false,
      reason: 'manual_disabled',
      messageBn: 'অ্যাডমিন কর্তৃক খাবার অর্ডার সাময়িকভাবে বন্ধ রাখা হয়েছে।',
      messageEn: 'Orders are temporarily disabled by the administration.'
    };
  }

  if (!settings.cutoffEnabled) {
    return {
      allowed: true,
      reason: 'unrestricted',
      messageBn: 'অর্ডার গ্রহণ সক্রিয় রয়েছে।',
      messageEn: 'Orders are currently open.'
    };
  }

  // Get current time in Bangladesh (GMT+6)
  // To be resilient in serverless environments, calculate BD time directly
  const nowUtc = new Date();
  const bdTime = new Date(nowUtc.getTime() + (6 * 60 + nowUtc.getTimezoneOffset()) * 60 * 1000);

  const currentHours = bdTime.getHours();
  const currentMinutes = bdTime.getMinutes();
  const currentTotal = currentHours * 60 + currentMinutes;

  const [rawH, rawM] = (settings.dailyCutoffTime || '09:20').split(':').map(Number);
  const cutoffH = isNaN(rawH) ? 9 : rawH;
  const cutoffM = isNaN(rawM) ? 20 : rawM;
  const cutoffTotal = cutoffH * 60 + cutoffM;

  const isAllowed = currentTotal <= cutoffTotal;
  const remaining = Math.max(0, cutoffTotal - currentTotal);

  // Format 12-hour string (e.g. 09:20 AM)
  const ampm = cutoffH >= 12 ? 'PM' : 'AM';
  const displayHours = (cutoffH % 12) || 12;
  const displayTime = `${displayHours.toString().padStart(2, '0')}:${cutoffM.toString().padStart(2, '0')} ${ampm}`;

  if (!isAllowed) {
    return {
      allowed: false,
      reason: 'cutoff_passed',
      cutoffTime: displayTime,
      remainingMinutes: 0,
      messageBn: `আজকের খাবার অর্ডারের নির্ধারিত সময় (${displayTime}) শেষ হয়ে গেছে। পরবর্তী দিনের জন্য অপেক্ষা করুন।`,
      messageEn: `Daily order cutoff (${displayTime}) has passed. Orders are closed for today.`
    };
  }

  return {
    allowed: true,
    reason: 'within_cutoff',
    cutoffTime: displayTime,
    remainingMinutes: remaining,
    messageBn: `আজকের খাবার অর্ডার গ্রহণ চালু আছে (সময়সীমা: ${displayTime} পর্যন্ত)।`,
    messageEn: `Orders are open until ${displayTime}.`
  };
}

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

    // Trigger Telegram cutoff close report immediately if daily cutoff just passed!
    if (evaluation.reason === 'cutoff_passed') {
      await checkAndRunTelegramAutomations().catch(() => {});
    }

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
        await Setting.findOneAndUpdate(
          { key: 'telegram_settings' },
          { $set: { 'value.lastCutoffReportDate': todayStr } }
        ).catch(() => {});
        await sendOrderClosedAndTableReport(false, todayStr).catch((err) =>
          console.warn('Telegram close alert warning:', err)
        );
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
