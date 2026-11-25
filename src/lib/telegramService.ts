import { connectToDatabase } from './mongodb';
import Setting from './models/Setting';
import { getAllOrders } from './dataStore';
import { DailyDutyAssignment, OrderData } from './types';
import { generateOrdersTablePngBuffer } from './telegramTableGenerator';

export const DEFAULT_TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '9227851975:AAHTo88AtVR3BJYil_rA4Xv9qjIMvRBwdkY';

export const DEFAULT_WEBSITE_URL = 'https://shopify-catering-service.vercel.app/';

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
          groups: Array.isArray(val.groups) && val.groups.length > 0 ? val.groups : DEFAULT_TELEGRAM_SETTINGS.groups,
          logs: Array.isArray(val.logs) ? val.logs : [],
        };
      }
    }
  } catch (err) {
    console.warn('getTelegramSettings fallback:', err);
  }
  return { ...DEFAULT_TELEGRAM_SETTINGS };
}

export async function saveTelegramSettings(
  updates: Partial<TelegramSettingsData>
): Promise<TelegramSettingsData> {
  const current = await getTelegramSettings();
  const next: TelegramSettingsData = {
    ...current,
    ...updates,
    botToken: (updates.botToken ?? current.botToken) || DEFAULT_TELEGRAM_BOT_TOKEN,
    websiteUrl: (updates.websiteUrl ?? current.websiteUrl) || DEFAULT_WEBSITE_URL,
    groups: updates.groups !== undefined ? updates.groups : current.groups,
    logs: updates.logs !== undefined ? updates.logs.slice(0, 30) : current.logs,
  };

  try {
    await connectToDatabase();
    if (Setting) {
      await Setting.findOneAndUpdate(
        { key: 'telegram_settings' },
        { $set: { value: next } },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn('saveTelegramSettings error:', err);
  }
  return next;
}

async function appendTelegramLog(entry: Omit<TelegramLogEntry, 'id' | 'timestamp'>) {
  try {
    const current = await getTelegramSettings();
    const newEntry: TelegramLogEntry = {
      ...entry,
      id: `tglog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    const nextLogs = [newEntry, ...(current.logs || [])].slice(0, 30);
    await Setting?.findOneAndUpdate(
      { key: 'telegram_settings' },
      { $set: { 'value.logs': nextLogs } }
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
      body: buildForm(chatId),
    });
    const data = await res.json();

    if (!data.ok && data.parameters?.migrate_to_chat_id) {
      const migratedId = String(data.parameters.migrate_to_chat_id);
      await migrateGroupChatIdIfNeeded(chatId, migratedId);
      const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
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
  const todaysOrders = getTodaysOrdersBDT(allOrders, targetDate);

  const totalBill = todaysOrders.reduce((s, o) => s + (Number(o.totalBill) || 0), 0);
  const totalPaid = todaysOrders.reduce((s, o) => s + (Number(o.paidAmount) || 0), 0);
  const totalDue = todaysOrders.reduce((s, o) => s + (o.changeDue < 0 ? Math.abs(o.changeDue) : 0), 0);
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
    const res = pngBuffer
      ? await sendTelegramPhotoMessage(settings.botToken, grp.chatId.trim(), pngBuffer, captionHtml)
      : await sendTelegramTextMessage(settings.botToken, grp.chatId.trim(), captionHtml);

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
 * Idempotent daily scheduler: checks Bangladesh Time (GMT+6) and triggers
 * (1) 08:20 AM Morning Order Reminder
 * (2) Daily Cutoff Order Closed + Master Table Image
 * Safe to invoke concurrently; atomic MongoDB locks prevent duplicate alerts on the same date.
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

    // Ensure telegram_settings exists before atomic lock attempt
    if (Setting) {
      const exists = await Setting.findOne({ key: 'telegram_settings' }).lean();
      if (!exists) {
        await saveTelegramSettings(settings);
      }
    }

    // 1. Morning 08:20 AM BDT Alert (fires once per day inside open window [morningTime .. cutoffTime])
    if (
      settings.morningAlertEnabled &&
      orderCtrl.ordersEnabled !== false &&
      totalMinutes >= morningMins &&
      totalMinutes <= cutoffMins &&
      settings.lastMorningAlertDate !== todayStr &&
      Setting
    ) {
      const lock = await Setting.findOneAndUpdate(
        {
          key: 'telegram_settings',
          'value.lastMorningAlertDate': { $ne: todayStr },
        },
        { $set: { 'value.lastMorningAlertDate': todayStr } },
        { new: true }
      );
      if (lock) {
        await sendMorningOrderReminder(cutoffDisplay, false);
        actions.push(`sent_morning_alert_${todayStr}`);
      }
    }

    // 2. Order Cutoff Passed Alert + Table Image Report (fires once per day right after cutoffMins)
    if (
      settings.cutoffAlertEnabled &&
      orderCtrl.cutoffEnabled !== false &&
      totalMinutes > cutoffMins &&
      settings.lastCutoffReportDate !== todayStr &&
      Setting
    ) {
      const lock = await Setting.findOneAndUpdate(
        {
          key: 'telegram_settings',
          'value.lastCutoffReportDate': { $ne: todayStr },
        },
        { $set: { 'value.lastCutoffReportDate': todayStr } },
        { new: true }
      );
      if (lock) {
        await sendOrderClosedAndTableReport(false, todayStr);
        actions.push(`sent_cutoff_report_${todayStr}`);
      }
    }

    return { executed: actions, todayStr, bdMinutes: totalMinutes };
  } catch (err: any) {
    console.warn('checkAndRunTelegramAutomations error:', err);
    return { executed: actions, error: err.message };
  }
}
