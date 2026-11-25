'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Sparkles,
  Image as ImageIcon,
  UserCheck,
  Bell,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import LuxuryLoader, { LuxurySpinnerIcon } from './LuxuryLoader';
import { useToast } from '@/context/ToastContext';

interface GroupTarget {
  chatId: string;
  label: string;
  enabled: boolean;
}

interface LogItem {
  id: string;
  timestamp: string;
  type: string;
  status: 'success' | 'error';
  groupId: string;
  message: string;
}

export default function TelegramBotPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [botToken, setBotToken] = useState('9227851975:AAHTo88AtVR3BJYil_rA4Xv9qjIMvRBwdkY');
  const [botEnabled, setBotEnabled] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState('https://shopify-catering-service.vercel.app/');
  const [groups, setGroups] = useState<GroupTarget[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [newChatLabel, setNewChatLabel] = useState('');

  const [morningAlertEnabled, setMorningAlertEnabled] = useState(true);
  const [morningAlertTime, setMorningAlertTime] = useState('08:20');
  const [dutyAlertEnabled, setDutyAlertEnabled] = useState(true);
  const [cutoffAlertEnabled, setCutoffAlertEnabled] = useState(true);
  const [sendTableImageOnClose, setSendTableImageOnClose] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const [botInfo, setBotInfo] = useState<{ username?: string; first_name?: string } | null>(null);
  const [testingAction, setTestingAction] = useState<string | null>(null);
  const [copiedCron, setCopiedCron] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telegram/settings?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setBotToken(d.botToken || '9227851975:AAHTo88AtVR3BJYil_rA4Xv9qjIMvRBwdkY');
        setBotEnabled(d.botEnabled !== false);
        setWebsiteUrl(d.websiteUrl || 'https://shopify-catering-service.vercel.app/');
        setGroups(Array.isArray(d.groups) ? d.groups : []);
        setMorningAlertEnabled(d.morningAlertEnabled !== false);
        setMorningAlertTime(d.morningAlertTime || '08:20');
        setDutyAlertEnabled(d.dutyAlertEnabled !== false);
        setCutoffAlertEnabled(d.cutoffAlertEnabled !== false);
        setSendTableImageOnClose(d.sendTableImageOnClose !== false);
        setLogs(Array.isArray(d.logs) ? d.logs : []);
      }
    } catch (e) {
      console.warn('Error loading telegram settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const persistSettings = async (overrideGroups?: GroupTarget[]) => {
    setSaving(true);
    try {
      const payload = {
        actionType: 'save',
        settings: {
          botToken: botToken.trim(),
          botEnabled,
          websiteUrl: websiteUrl.trim(),
          groups: overrideGroups || groups,
          morningAlertEnabled,
          morningAlertTime,
          dutyAlertEnabled,
          cutoffAlertEnabled,
          sendTableImageOnClose,
        },
      };
      const res = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Telegram automation settings saved cleanly!', 'Telegram Saved');
      } else {
        toast.error(json.error || 'Failed to save settings', 'Error');
      }
    } catch (e: any) {
      toast.error(e.message || 'Network error saving Telegram config', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newChatId.trim();
    if (!cleanId) return;
    if (groups.some((g) => g.chatId === cleanId)) {
      toast.warning('This Group ID is already in the list!', 'Duplicate Group');
      return;
    }
    const nextGroups = [
      ...groups,
      {
        chatId: cleanId,
        label: newChatLabel.trim() || `Telegram Group (${cleanId})`,
        enabled: true,
      },
    ];
    setGroups(nextGroups);
    setNewChatId('');
    setNewChatLabel('');
    await persistSettings(nextGroups);
  };

  const handleToggleGroup = async (chatId: string) => {
    const nextGroups = groups.map((g) =>
      g.chatId === chatId ? { ...g, enabled: !g.enabled } : g
    );
    setGroups(nextGroups);
    await persistSettings(nextGroups);
  };

  const handleRemoveGroup = async (chatId: string) => {
    const nextGroups = groups.filter((g) => g.chatId !== chatId);
    setGroups(nextGroups);
    await persistSettings(nextGroups);
  };

  const runAction = async (
    actionType: 'test_connection' | 'test_morning' | 'test_duty' | 'test_cutoff_report' | 'send_table_now'
  ) => {
    setTestingAction(actionType);
    try {
      // Save any pending config first before testing
      await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'save',
          settings: {
            botToken: botToken.trim(),
            botEnabled,
            websiteUrl: websiteUrl.trim(),
            groups,
            morningAlertEnabled,
            morningAlertTime,
            dutyAlertEnabled,
            cutoffAlertEnabled,
            sendTableImageOnClose,
          },
        }),
      });

      const res = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, botToken: botToken.trim() }),
      });
      const json = await res.json();

      if (actionType === 'test_connection') {
        if (json.success && json.bot) {
          setBotInfo(json.bot);
          toast.success(
            `Connected to @${json.bot.username} (${json.bot.first_name})!`,
            'Bot Online ✅'
          );
        } else {
          toast.error(json.error || 'Bot token invalid or unreachable', 'Connection Failed');
        }
      } else {
        if (json.success) {
          toast.success(json.message || 'Alert delivered to Telegram!', 'Telegram Delivered');
          fetchSettings();
        } else {
          toast.error(json.message || json.error || 'Could not deliver message. Ensure bot is added as Admin in group.', 'Delivery Issue');
          fetchSettings();
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Telegram request failed', 'Error');
    } finally {
      setTestingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-sky-500/30 p-8 shadow-2xl">
        <LuxuryLoader message="Loading Telegram Bot Automation..." subMessage="Synchronizing groups, tokens & schedule telemetry" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-sky-500/35 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-lg">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold font-serif text-white">
                Telegram Bot & Automated Broadcasts
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                botEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/35'
              }`}>
                {botEnabled ? 'AUTOMATION ACTIVE' : 'PAUSED'}
              </span>
              {botInfo?.username && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  @{botInfo.username}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage Telegram Group IDs, 08:20 AM BDT daily @everyone reminders, duty alerts, and automated order close table PNG uploads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => runAction('test_connection')}
            disabled={!!testingAction}
            className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {testingAction === 'test_connection' ? <LuxurySpinnerIcon size="xs" /> : <Radio className="w-3.5 h-3.5" />}
            <span>Test Bot Connection</span>
          </button>

          <button
            onClick={() => persistSettings()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
          >
            {saving ? <LuxurySpinnerIcon size="xs" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Grid Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Bot Credentials & Group IDs */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <h3 className="font-serif font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Bot Credentials & Target Group IDs</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Telegram Bot HTTP API Token
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-amber-300 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Catering Portal Link Shared in Messages
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-400" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          {/* Add Group ID manually */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Add Telegram Group ID Manually
            </p>
            <form onSubmit={handleAddGroup} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input
                type="text"
                required
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                placeholder="e.g. -5069052275 or -100..."
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={newChatLabel}
                onChange={(e) => setNewChatLabel(e.target.value)}
                placeholder="Group Name Label"
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Group List */}
            <div className="space-y-2 pt-1">
              {groups.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No group IDs configured. Add one above.</p>
              ) : (
                groups.map((grp) => (
                  <div
                    key={grp.chatId}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{grp.label}</p>
                      <p className="text-[11px] font-mono text-sky-400">{grp.chatId}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(grp.chatId)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          grp.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {grp.enabled ? 'Active' : 'Muted'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(grp.chatId)}
                        className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800/50 transition-colors"
                        title="Remove group ID"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Tip: Add <code className="text-amber-300">@shopifyCateringbot</code> to your Telegram group first so it has permission to post messages & order table images.
            </p>
          </div>
        </div>

        {/* Right: Automation Rules & Instant Test Controls */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <h3 className="font-serif font-bold text-base text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Automation Rules & Instant Test Center</span>
          </h3>

          <div className="space-y-3">
            {/* Master Bot Switch */}
            <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-white">Enable Telegram Bot Automation</p>
                <p className="text-[11px] text-slate-400">Master switch for all automated broadcasts</p>
              </div>
              <input
                type="checkbox"
                checked={botEnabled}
                onChange={(e) => setBotEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            {/* Morning Alert */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Daily Morning @everyone Alert (BDT)</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Sends website link + order callout daily</p>
                </div>
                <input
                  type="checkbox"
                  checked={morningAlertEnabled}
                  onChange={(e) => setMorningAlertEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">Trigger Time (BDT):</span>
                <input
                  type="time"
                  value={morningAlertTime}
                  onChange={(e) => setMorningAlertTime(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300"
                />
              </div>
            </div>

            {/* Duty Alert */}
            <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant Daily Responsibility Broadcast</span>
                </p>
                <p className="text-[11px] text-slate-400">Posts member name when assigned duty</p>
              </div>
              <input
                type="checkbox"
                checked={dutyAlertEnabled}
                onChange={(e) => setDutyAlertEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>

            {/* Cutoff Table Image Alert */}
            <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Auto Send Orders Table Image on Cutoff Close</span>
                </p>
                <p className="text-[11px] text-slate-400">Posts Orders Closed notice + high-res PNG table</p>
              </div>
              <input
                type="checkbox"
                checked={cutoffAlertEnabled}
                onChange={(e) => setCutoffAlertEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>
          </div>

          {/* Live Test Buttons */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <p className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test & Trigger Live Telegram Broadcasts</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!!testingAction}
                onClick={() => runAction('test_morning')}
                className="px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {testingAction === 'test_morning' ? <LuxurySpinnerIcon size="xs" /> : <Send className="w-3.5 h-3.5" />}
                <span>Test 8:20 Alert</span>
              </button>

              <button
                type="button"
                disabled={!!testingAction}
                onClick={() => runAction('test_duty')}
                className="px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {testingAction === 'test_duty' ? <LuxurySpinnerIcon size="xs" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>Test Duty Alert</span>
              </button>

              <button
                type="button"
                disabled={!!testingAction}
                onClick={() => runAction('send_table_now')}
                className="px-3 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {testingAction === 'send_table_now' ? <LuxurySpinnerIcon size="xs" /> : <ImageIcon className="w-3.5 h-3.5" />}
                <span>Send Table PNG</span>
              </button>
            </div>
          </div>

          {/* Automation Endpoint Copy */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase">24/7 Cron Trigger Endpoint (Optional external ping)</p>
              <p className="text-[11px] font-mono text-sky-400 truncate">
                https://shopify-catering-service.vercel.app/api/telegram/automate
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('https://shopify-catering-service.vercel.app/api/telegram/automate');
                setCopiedCron(true);
                setTimeout(() => setCopiedCron(false), 2000);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold flex items-center gap-1 shrink-0"
            >
              {copiedCron ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCron ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Logs */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="font-serif font-bold text-white text-sm">Telegram Bot Delivery Logs</h4>
            <p className="text-[11px] text-slate-400">Real-time record of automated messages & table image uploads</p>
          </div>
          <button
            onClick={fetchSettings}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">
              No Telegram broadcasts sent yet. Click one of the Test buttons above to verify!
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-white font-medium">{log.message}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Group: {log.groupId} • Type: {log.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
