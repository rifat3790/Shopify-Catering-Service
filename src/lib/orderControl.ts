import { connectToDatabase } from './mongodb';
import Setting from './models/Setting';

export interface OrderControlData {
  ordersEnabled: boolean;
  dailyCutoffTime: string; // "HH:mm" 24h, Bangladesh time
  cutoffEnabled: boolean;
  noticeMessageBn?: string;
  noticeMessageEn?: string;
}

export const DEFAULT_ORDER_CONTROL: OrderControlData = {
  ordersEnabled: true,
  dailyCutoffTime: '09:20',
  cutoffEnabled: true,
  noticeMessageBn: 'প্রতিদিন সকাল ৯:২০ এর মধ্যে খাবার অর্ডার করতে হবে। এরপর অর্ডার স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।',
  noticeMessageEn: 'Catering orders must be placed by 09:20 AM daily.',
};

/** Current minutes since midnight in Bangladesh (UTC+6, no DST). */
export function bdMinutesNow(): number {
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 3600 * 1000);
  return bd.getUTCHours() * 60 + bd.getUTCMinutes();
}

export function evaluateOrderAllowed(settings: OrderControlData) {
  if (!settings.ordersEnabled) {
    return {
      allowed: false,
      reason: 'manual_disabled',
      cutoffTime: undefined as string | undefined,
      remainingMinutes: 0,
      messageBn: 'অ্যাডমিন কর্তৃক খাবার অর্ডার সাময়িকভাবে বন্ধ রাখা হয়েছে।',
      messageEn: 'Orders are temporarily disabled by the administration.',
    };
  }

  if (!settings.cutoffEnabled) {
    return {
      allowed: true,
      reason: 'unrestricted',
      cutoffTime: undefined as string | undefined,
      remainingMinutes: 0,
      messageBn: 'অর্ডার গ্রহণ সক্রিয় রয়েছে।',
      messageEn: 'Orders are currently open.',
    };
  }

  const currentTotal = bdMinutesNow();
  const [rawH, rawM] = (settings.dailyCutoffTime || '09:20').split(':').map(Number);
  const cutoffH = isNaN(rawH) ? 9 : rawH;
  const cutoffM = isNaN(rawM) ? 20 : rawM;
  const cutoffTotal = cutoffH * 60 + cutoffM;

  const isAllowed = currentTotal <= cutoffTotal;
  const remaining = Math.max(0, cutoffTotal - currentTotal);

  const ampm = cutoffH >= 12 ? 'PM' : 'AM';
  const displayHours = (cutoffH % 12) || 12;
  const displayTime = `${displayHours.toString().padStart(2, '0')}:${cutoffM.toString().padStart(2, '0')} ${ampm}`;

  if (!isAllowed) {
    return {
      allowed: false,
      reason: 'cutoff_passed',
      cutoffTime: displayTime,
      remainingMinutes: 0,
      messageBn: `আজকের খাবার অর্ডারের নির্ধারিত সময় (${displayTime}) শেষ হয়ে গেছে। পরবর্তী দিনের জন্য অপেক্ষা করুন।`,
      messageEn: `Daily order cutoff (${displayTime}) has passed. Orders are closed for today.`,
    };
  }

  return {
    allowed: true,
    reason: 'within_cutoff',
    cutoffTime: displayTime,
    remainingMinutes: remaining,
    messageBn: `আজকের খাবার অর্ডার গ্রহণ চালু আছে (সময়সীমা: ${displayTime} পর্যন্ত)।`,
    messageEn: `Orders are open until ${displayTime}.`,
  };
}

export async function getOrderControl(): Promise<OrderControlData> {
  try {
    await connectToDatabase();
    if (Setting) {
      const doc: any = await Setting.findOne({ key: 'order_control' }).lean();
      if (doc && doc.value) return { ...DEFAULT_ORDER_CONTROL, ...doc.value };
    }
  } catch {
    // fall back to defaults
  }
  return DEFAULT_ORDER_CONTROL;
}
