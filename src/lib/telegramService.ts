import { connectToDatabase } from './mongodb';
import Setting from './models/Setting';
import { getAllOrders } from './dataStore';
import { DailyDutyAssignment, OrderData } from './types';
import { generateOrdersTablePngBuffer } from './telegramTableGenerator';
import DutyAssignment from './models/DutyAssignment';

export const DEFAULT_TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || ''; // real token lives in env or the DB settings — never in source

export const DEFAULT_WEBSITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://shopify-catering-service.vercel.app/';

export interface TelegramGroupTarget {
  chatId: string;
  label: string;
  enabled: boolean;
}

export interface TelegramLogEntry {
  id: string;
  timestamp: string;
  type: 'morning' | 'duty' | 'cutoff' | 'test' | 'system';
  status: 'success' | 'error';
  groupId: string;
  message: string;
}

export interface TelegramSettingsData {
  botToken: string;
  botEnabled: boolean;
  groups: TelegramGroupTarget[];
  websiteUrl: string;
  morningAlertEnabled: boolean;
  morningAlertTime: string; // HH:mm in BDT, default '08:20'
  dutyAlertEnabled: boolean;
  cutoffAlertEnabled: boolean;
  sendTableImageOnClose: boolean;
  lastMorningAlertDate?: string; // 'YYYY-MM-DD'
  lastCutoffReportDate?: string; // 'YYYY-MM-DD'
  logs: TelegramLogEntry[];
}

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettingsData = {
  botToken: DEFAULT_TELEGRAM_BOT_TOKEN,
  botEnabled: true,
  groups: [
    {
      chatId: '-5069052275',
      label: 'Shopify Catering Main Group',
      enabled: true,
    },
  ],
  websiteUrl: DEFAULT_WEBSITE_URL,
  morningAlertEnabled: true,
  morningAlertTime: '08:20',
  dutyAlertEnabled: true,
  cutoffAlertEnabled: true,
  sendTableImageOnClose: true,
  logs: [],
};

export function getBangladeshTimeInfo() {
  const nowUtc = new Date();
  const bdTime = new Date(nowUtc.getTime() + (6 * 60 + nowUtc.getTimezoneOffset()) * 60 * 1000);
  const year = bdTime.getFullYear();
  const month = String(bdTime.getMonth() + 1).padStart(2, '0');
  const day = String(bdTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const hours = bdTime.getHours();
  const minutes = bdTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  return { bdTime, todayStr, hours, minutes, totalMinutes };
}

export async function getTelegramSettings(): Promise<TelegramSettingsData> {
  try {
    await connectToDatabase();
    if (Setting) {
      const doc = await Setting.findOne({ key: 'telegram_settings' }).lean();
      if (doc && (doc as any).value) {
        const val = (doc as any).value;
        return {
          ...DEFAULT_TELEGRAM_SETTINGS,
          ...val,
          botToken: val.botToken || DEFAULT_TELEGRAM_BOT_TOKEN,
          websiteUrl: val.websiteUrl || DEFAULT_WEBSITE_URL,
          // An empty list means the admin removed all groups — don't resurrect the default group
          groups: Array.isArray(val.groups) ? val.groups : DEFAULT_TELEGRAM_SETTINGS.groups,
          logs: Array.isArray(val.logs) ? val.logs : [],
        };
      }
    }
  } catch (err) {
    console.warn('getTelegramSettings fallback:', err);
  }
  return { ...DEFAULT_TELEGRAM_SETTINGS };
}

// Fields an admin may change. Automation locks (lastMorningAlertDate / lastCutoffReportDate) are
// never written from here, so a panel save can't wipe them and cause duplicate alerts.
const EDITABLE_TELEGRAM_FIELDS: (keyof TelegramSettingsData)[] = [
  'botToken',
  'botEnabled',
  'groups',
  'websiteUrl',
  'morningAlertEnabled',
  'morningAlertTime',
  'dutyAlertEnabled',
  'cutoffAlertEnabled',
  'sendTableImageOnClose',
];

export async function saveTelegramSettings(
  updates: Partial<TelegramSettingsData>
): Promise<TelegramSettingsData> {
  const $set: Record<string, any> = {};
  for (const k of EDITABLE_TELEGRAM_FIELDS) {
    const v = (updates as any)[k];
    if (v === undefined) continue;
    if (k === 'botToken' && !String(v || '').trim()) continue; // never clear the token with an empty value
    $set[`value.${k}`] = v;
  }
  if (updates.logs !== undefined) $set['value.logs'] = updates.logs.slice(0, 30);

  await connectToDatabase();
  if (Setting && Object.keys($set).length > 0) {
    await Setting.findOneAndUpdate({ key: 'telegram_settings' }, { $set }, { upsert: true, new: true });
  }
  return getTelegramSettings();
}

async function appendTelegramLog(entry: Omit<TelegramLogEntry, 'id' | 'timestamp'>) {
  try {
    const newEntry: TelegramLogEntry = {
      ...entry,
      id: `tglog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    // Atomic push: concurrent sends no longer overwrite each other's log entries
    await Setting?.updateOne(
      { key: 'telegram_settings' },
      { $push: { 'value.logs': { $each: [newEntry], $position: 0, $slice: 30 } } }
    );
  } catch (e) {}
}

async function migrateGroupChatIdIfNeeded(oldChatId: string, newChatId: string) {
  try {
    const current = await getTelegramSettings();
    const updatedGroups = current.groups.map((g) =>
      g.chatId === oldChatId ? { ...g, chatId: String(newChatId) } : g
    );
    await saveTelegramSettings({ groups: updatedGroups });
  } catch (e) {}
}

export async function testTelegramBotToken(botToken: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  return res.json();
}

export async function sendTelegramTextMessage(
  botToken: string,
  chatId: string,
  htmlText: string
): Promise<{ ok: boolean; error?: string; result?: any; migratedTo?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();

    // Auto handle Telegram basic group -> supergroup migration
    if (!data.ok && data.parameters?.migrate_to_chat_id) {
      const migratedId = String(data.parameters.migrate_to_chat_id);
      await migrateGroupChatIdIfNeeded(chatId, migratedId);
      const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: migratedId,
          text: htmlText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });
      const retryData = await retryRes.json();
      return {
        ok: Boolean(retryData.ok),
        error: retryData.description,
        result: retryData.result,
        migratedTo: migratedId,
      };
    }

    return {
      ok: Boolean(data.ok),
      error: data.description,
      result: data.result,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Telegram request failed' };
  }
}

export async function sendTelegramPhotoMessage(
  botToken: string,
  chatId: string,
  pngBuffer: Buffer,
  captionHtml: string
): Promise<{ ok: boolean; error?: string; result?: any; migratedTo?: string }> {
  try {
    const buildForm = (targetChatId: string) => {
      const formData = new FormData();
      formData.append('chat_id', targetChatId);
      formData.append('caption', captionHtml.slice(0, 1020));
      formData.append('parse_mode', 'HTML');
      const blob = new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' });
      formData.append('photo', blob, `Shopify-Catering-Orders-${Date.now()}.png`);
      return formData;
    };

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      body: buildForm(chatId),
    });
    const data = await res.json();

    if (!data.ok && data.parameters?.migrate_to_chat_id) {
      const migratedId = String(data.parameters.migrate_to_chat_id);
      await migrateGroupChatIdIfNeeded(chatId, migratedId);
      const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        body: buildForm(migratedId),
      });
      const retryData = await retryRes.json();
      return {
        ok: Boolean(retryData.ok),
        error: retryData.description,
        result: retryData.result,
        migratedTo: migratedId,
      };
    }

    return {
      ok: Boolean(data.ok),
      error: data.description,
      result: data.result,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Telegram photo upload failed' };
  }
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendMorningOrderReminder(
  cutoffDisplayTime = '09:20 AM',
  isTest = false
): Promise<{ sentCount: number; errors: string[] }> {
  const settings = await getTelegramSettings();
  if (!settings.botEnabled && !isTest) return { sentCount: 0, errors: [] };

  const activeGroups = (settings.groups || []).filter((g) => g.enabled && g.chatId.trim());
  if (activeGroups.length === 0) {
    return { sentCount: 0, errors: ['No active Telegram Group IDs configured.'] };
  }

  const website = settings.websiteUrl || DEFAULT_WEBSITE_URL;
  const text = [
    `${isTest ? '🧪 <b>[TEST ALERT]</b>\n' : ''}🍽️ <b>GOOD MORNING TEAM!</b> @everyone`,
    ``,
    `⏰ <b>Daily Catering Order Portal is NOW OPEN!</b>`,
    `Please submit your breakfast / snack order before <b>${escapeHtml(cutoffDisplayTime)}</b> (BDT).`,
    ``,
    `🔗 <b>Submit Your Order Here:</b>`,
    `<a href="${escapeHtml(website)}">${escapeHtml(website)}</a>`,
    ``,
    `⚠️ <i>Note: Ordering closes automatically at ${escapeHtml(cutoffDisplayTime)}.</i>`,
  ].join('\n');

  let sentCount = 0;
  const errors: string[] = [];

  for (const grp of activeGroups) {
    const r = await sendTelegramTextMessage(settings.botToken, grp.chatId.trim(), text);
    if (r.ok) {
      sentCount++;
      await appendTelegramLog({
        type: isTest ? 'test' : 'morning',
        status: 'success',
        groupId: r.migratedTo || grp.chatId,
        message: `Morning @everyone order alert sent to ${grp.label || grp.chatId}`,
      });
    } else {
      const errMsg = `${grp.label || grp.chatId}: ${r.error || 'Failed'}`;
      errors.push(errMsg);
      await appendTelegramLog({
        type: isTest ? 'test' : 'morning',
        status: 'error',
        groupId: grp.chatId,
        message: errMsg,
      });
    }
  }

  return { sentCount, errors };
}

export async function sendTelegramDutyNotification(
  duty: DailyDutyAssignment,
  isTest = false
): Promise<{ sentCount: number; errors: string[] }> {
  const settings = await getTelegramSettings();
  if ((!settings.botEnabled || !settings.dutyAlertEnabled) && !isTest) {
    return { sentCount: 0, errors: [] };
  }

  const activeGroups = (settings.groups || []).filter((g) => g.enabled && g.chatId.trim());
  if (activeGroups.length === 0) {
    return { sentCount: 0, errors: ['No active Telegram Group IDs configured.'] };
  }

  const website = settings.websiteUrl || DEFAULT_WEBSITE_URL;
  const tasksList = (duty.tasks && duty.tasks.length > 0
    ? duty.tasks
    : ['Cash / Payment Collection', 'Snack & Refreshment Purchase', 'Timely Team Delivery']
  )
    .map((t) => `• ${escapeHtml(t)}`)
    .join('\n');

  const text = [
    `${isTest ? '🧪 <b>[TEST ALERT]</b>\n' : ''}📋 <b>DAILY CATERING RESPONSIBILITY ASSIGNED</b>`,
    `📅 <b>Date:</b> <code>${escapeHtml(duty.date)}</code>`,
    ``,
    `👤 <b>Responsible Member:</b> <b>${escapeHtml(duty.assignedUserName)}</b>`,
    duty.assignedUserEmail ? `📧 <b>Email:</b> <code>${escapeHtml(duty.assignedUserEmail)}</code>` : '',
    `🛡️ <b>Assigned By:</b> ${escapeHtml(duty.assignedByName || 'Administrator')}`,
    ``,
    `✅ <b>Assigned Duties for ${escapeHtml(duty.date)}:</b>`,
    tasksList,
    duty.instructions ? `\n📝 <i>Note: ${escapeHtml(duty.instructions)}</i>` : '',
    ``,
    `🔗 <a href="${escapeHtml(website)}">Open Catering Portal</a>`,
  ]
    .filter(Boolean)
    .join('\n');

  let sentCount = 0;
  const errors: string[] = [];

  for (const grp of activeGroups) {
    const r = await sendTelegramTextMessage(settings.botToken, grp.chatId.trim(), text);
    if (r.ok) {
      sentCount++;
      await appendTelegramLog({
        type: isTest ? 'test' : 'duty',
        status: 'success',
        groupId: r.migratedTo || grp.chatId,
        message: `Duty alert sent for ${duty.assignedUserName} (${duty.date})`,
      });
    } else {
      const errMsg = `${grp.label || grp.chatId}: ${r.error || 'Failed'}`;
      errors.push(errMsg);
      await appendTelegramLog({
        type: isTest ? 'test' : 'duty',
        status: 'error',
        groupId: grp.chatId,
        message: errMsg,
      });
    }
  }

  return { sentCount, errors };
}

export function getTodaysOrdersBDT(allOrders: OrderData[], todayStr: string): OrderData[] {
  return (allOrders || []).filter((o) => {
    if (!o.orderDate) return false;
    const d = new Date(o.orderDate);
    if (isNaN(d.getTime())) return false;
    const bdDate = new Date(d.getTime() + (6 * 60 + d.getTimezoneOffset()) * 60 * 1000);
    const y = bdDate.getFullYear();
    const m = String(bdDate.getMonth() + 1).padStart(2, '0');
    const day = String(bdDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` === todayStr;
  });
}

export async function sendOrderClosedAndTableReport(
  isTest = false,
  customDateLabel?: string
): Promise<{ sentCount: number; ordersCount: number; errors: string[] }> {
  const settings = await getTelegramSettings();
  if ((!settings.botEnabled || !settings.cutoffAlertEnabled) && !isTest) {
    return { sentCount: 0, ordersCount: 0, errors: [] };
  }

  const activeGroups = (settings.groups || []).filter((g) => g.enabled && g.chatId.trim());
  if (activeGroups.length === 0) {
    return { sentCount: 0, ordersCount: 0, errors: ['No active Telegram Group IDs configured.'] };
  }

  const { todayStr } = getBangladeshTimeInfo();
  const targetDate = customDateLabel || todayStr;
  const allOrders = await getAllOrders();
  const todaysOrders = getTodaysOrdersBDT(allOrders, targetDate).filter((o) => o.status !== 'Cancelled');

  const totalBill = todaysOrders.reduce((s, o) => s + (Number(o.totalBill) || 0), 0);
  const totalPaid = todaysOrders.reduce((s, o) => s + Math.min(Number(o.paidAmount) || 0, Number(o.totalBill) || 0), 0);
  const totalDue = todaysOrders.reduce((s, o) => s + (o.paymentMethod !== 'Wallet' && o.changeDue < 0 ? Math.abs(o.changeDue) : 0), 0);
  const collRate = totalBill > 0 ? Math.min(100, (totalPaid / totalBill) * 100) : 0;

  const captionHtml = [
    `${isTest ? '🧪 <b>[TEST REPORT]</b>\n' : ''}🔒 <b>DAILY ORDERS CLOSED FOR TODAY (${escapeHtml(targetDate)})</b>`,
    ``,
    `📊 <b>Executive Order Summary:</b>`,
    `• Total Orders: <b>${todaysOrders.length}</b>`,
    `• Total Billed: <b>Tk ${totalBill.toFixed(2)}</b>`,
    `• Total Collected: <b>Tk ${totalPaid.toFixed(2)}</b> (${collRate.toFixed(0)}%)`,
    totalDue > 0 ? `• Outstanding Due: <b>Tk ${totalDue.toFixed(2)}</b>` : `• Status: <b>All Accounts Settled</b>`,
    ``,
    `👇 <i>Complete Master Order Table attached below</i>`,
  ].join('\n');

  let pngBuffer: Buffer | null = null;
  if (settings.sendTableImageOnClose || isTest) {
    try {
      pngBuffer = await generateOrdersTablePngBuffer(
        todaysOrders,
        targetDate,
        'Shopify Catering - Closed Orders Summary'
      );
    } catch (imgErr) {
      console.error('Failed to render table PNG image:', imgErr);
    }
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const grp of activeGroups) {
    let res = pngBuffer
      ? await sendTelegramPhotoMessage(settings.botToken, grp.chatId.trim(), pngBuffer, captionHtml)
      : await sendTelegramTextMessage(settings.botToken, grp.chatId.trim(), captionHtml);
    if (!res.ok && pngBuffer) {
      // Image upload failed (size / timeout) — still deliver the summary as text
      res = await sendTelegramTextMessage(settings.botToken, grp.chatId.trim(), captionHtml);
    }

    if (res.ok) {
      sentCount++;
      await appendTelegramLog({
        type: isTest ? 'test' : 'cutoff',
        status: 'success',
        groupId: res.migratedTo || grp.chatId,
        message: `Orders closed & table image report sent (${todaysOrders.length} orders)`,
      });
    } else {
      const errMsg = `${grp.label || grp.chatId}: ${res.error || 'Failed'}`;
      errors.push(errMsg);
      await appendTelegramLog({
        type: isTest ? 'test' : 'cutoff',
        status: 'error',
        groupId: grp.chatId,
        message: errMsg,
      });
    }
  }

  return { sentCount, ordersCount: todaysOrders.length, errors };
}

/**
 * Sends today's duty alert once per (date + assignee). Atomic claim on the duty document,
 * so repeated saves / concurrent scheduler runs never duplicate it; a reassignment sends again.
 * Future-dated duties are sent on their own day by the scheduler.
 */
export async function notifyDutyIfDue(duty: DailyDutyAssignment | null | undefined): Promise<boolean> {
  try {
    if (!duty || !duty.date || !duty.assignedUserEmail) return false;
    const { todayStr } = getBangladeshTimeInfo();
    if (duty.date !== todayStr) return false;

    await connectToDatabase();
    if (!DutyAssignment) return false;
    const key = `${duty.date}|${duty.assignedUserEmail.toLowerCase()}`;
    const claimed = await DutyAssignment.findOneAndUpdate(
      { date: duty.date, telegramNotifiedFor: { $ne: key } },
      { $set: { telegramNotifiedFor: key } },
      { new: true }
    );
    if (!claimed) return false;

    const r = await sendTelegramDutyNotification(duty, false);
    if (r.sentCount === 0) {
      // roll back so the scheduler can retry later
      await DutyAssignment.updateOne({ date: duty.date, telegramNotifiedFor: key }, { $set: { telegramNotifiedFor: '' } });
      return false;
    }
    return true;
  } catch (e) {
    console.warn('notifyDutyIfDue error:', e);
    return false;
  }
}

/**
 * Idempotent daily scheduler (called every few minutes by the server-side scheduler):
 * (1) Morning order reminder  (2) Today's duty alert  (3) Cutoff "orders closed" report + table image.
 * Each send is claimed atomically per day; if delivery fails the claim is released so the next run retries.
 */
export async function checkAndRunTelegramAutomations() {
  const actions: string[] = [];
  try {
    await connectToDatabase();
    const settings = await getTelegramSettings();
    if (!settings.botEnabled || !settings.groups?.some((g) => g.enabled)) {
      return { executed: actions, skipped: 'Bot disabled or no active groups' };
    }

    const orderControlDoc = Setting ? await Setting.findOne({ key: 'order_control' }).lean() : null;
    const orderCtrl = (orderControlDoc as any)?.value || {
      ordersEnabled: true,
      dailyCutoffTime: '09:20',
      cutoffEnabled: true,
    };

    const { todayStr, totalMinutes } = getBangladeshTimeInfo();

    const [mH, mM] = (settings.morningAlertTime || '08:20').split(':').map(Number);
    const morningMins = (isNaN(mH) ? 8 : mH) * 60 + (isNaN(mM) ? 20 : mM);

    const [cH, cM] = (orderCtrl.dailyCutoffTime || '09:20').split(':').map(Number);
    const cutoffMins = (isNaN(cH) ? 9 : cH) * 60 + (isNaN(cM) ? 20 : cM);

    const ampm = (isNaN(cH) ? 9 : cH) >= 12 ? 'PM' : 'AM';
    const dHour = ((isNaN(cH) ? 9 : cH) % 12) || 12;
    const cutoffDisplay = `${String(dHour).padStart(2, '0')}:${String(isNaN(cM) ? 20 : cM).padStart(2, '0')} ${ampm}`;

    // Ensure telegram_settings exists before atomic lock attempts
    if (Setting) {
      const exists = await Setting.findOne({ key: 'telegram_settings' }).lean();
      if (!exists) {
        await Setting.updateOne(
          { key: 'telegram_settings' },
          { $setOnInsert: { value: { ...settings, logs: [] } } },
          { upsert: true }
        );
      }
    }

    const claim = async (field: 'lastMorningAlertDate' | 'lastCutoffReportDate') => {
      if (!Setting) return null;
      const prev = (settings as any)[field] || '';
      const doc = await Setting.findOneAndUpdate(
        { key: 'telegram_settings', [`value.${field}`]: { $ne: todayStr } },
        { $set: { [`value.${field}`]: todayStr } },
        { new: true }
      );
      return doc ? { prev } : null;
    };
    const release = async (field: 'lastMorningAlertDate' | 'lastCutoffReportDate', prev: string) => {
      await Setting?.updateOne(
        { key: 'telegram_settings', [`value.${field}`]: todayStr },
        { $set: { [`value.${field}`]: prev } }
      ).catch(() => {});
    };

    // 1. Morning reminder (once per day, inside [morningTime .. cutoffTime])
    if (
      settings.morningAlertEnabled &&
      orderCtrl.ordersEnabled !== false &&
      totalMinutes >= morningMins &&
      totalMinutes <= cutoffMins &&
      settings.lastMorningAlertDate !== todayStr
    ) {
      const lock = await claim('lastMorningAlertDate');
      if (lock) {
        const r = await sendMorningOrderReminder(cutoffDisplay, false).catch(() => ({ sentCount: 0, errors: ['exception'] }));
        if (r.sentCount > 0) actions.push(`sent_morning_alert_${todayStr}`);
        else {
          await release('lastMorningAlertDate', lock.prev);
          actions.push(`morning_alert_failed_will_retry`);
        }
      }
    }

    // 2. Today's duty alert (for duties assigned in advance)
    if (settings.dutyAlertEnabled && DutyAssignment) {
      // Duties saved before this field existed were already announced at assignment time — skip them
      const todayDuty: any = await DutyAssignment.findOne({ date: todayStr, telegramNotifiedFor: { $exists: true } }).lean();
      if (todayDuty) {
        const sent = await notifyDutyIfDue({ ...todayDuty, id: todayDuty._id?.toString() } as DailyDutyAssignment);
        if (sent) actions.push(`sent_duty_alert_${todayStr}`);
      }
    }

    // 3. Cutoff report (once per day, after cutoff; skipped when orders are disabled e.g. holidays)
    if (
      settings.cutoffAlertEnabled &&
      orderCtrl.cutoffEnabled !== false &&
      orderCtrl.ordersEnabled !== false &&
      totalMinutes > cutoffMins &&
      settings.lastCutoffReportDate !== todayStr
    ) {
      const lock = await claim('lastCutoffReportDate');
      if (lock) {
        const r = await sendOrderClosedAndTableReport(false, todayStr).catch(() => ({ sentCount: 0, ordersCount: 0, errors: ['exception'] }));
        if (r.sentCount > 0) actions.push(`sent_cutoff_report_${todayStr}`);
        else {
          await release('lastCutoffReportDate', lock.prev);
          actions.push(`cutoff_report_failed_will_retry`);
        }
      }
    }

    return { executed: actions, todayStr, bdMinutes: totalMinutes };
  } catch (err: any) {
    console.warn('checkAndRunTelegramAutomations error:', err);
    return { executed: actions, error: err.message };
  }
}
