'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ThemePresetId, CustomThemeConfig } from '@/lib/types';
import { 
  Palette, 
  Check, 
  Sparkles, 
  X, 
  Sliders, 
  RotateCcw, 
  Save, 
  ShieldCheck, 
  Layers,
  ArrowRight
} from 'lucide-react';

const DARK_BG_PRESETS = [
  { label: 'Obsidian Slate', hex: '#030712' },
  { label: 'Midnight Blue', hex: '#030717' },
  { label: 'Velvet Plum', hex: '#090514' },
  { label: 'Garnet Black', hex: '#0f0507' },
  { label: 'Abyssal Forest', hex: '#020b08' },
];

const FONT_PRESETS = [
  { label: 'Executive Serif', value: "'Playfair Display', Georgia, serif" },
  { label: 'Cyber Tech Sans', value: "'Space Grotesk', 'Inter', system-ui, sans-serif" },
  { label: 'Imperial Roman', value: "'Cinzel', 'Playfair Display', Georgia, serif" },
  { label: 'Clean Modern', value: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  { label: 'Enterprise Sans', value: "'Inter', system-ui, sans-serif" },
];

export default function ThemeSelectorModal() {
  const { 
    themeId, 
    customTheme, 
    presets, 
    setTheme, 
    isThemeModalOpen, 
    setIsThemeModalOpen, 
    isSaving 
  } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedId, setSelectedId] = useState<ThemePresetId>(themeId);
  const [localCustom, setLocalCustom] = useState<CustomThemeConfig>(customTheme);

  // Sync internal state when modal opens
  useEffect(() => {
    if (isThemeModalOpen) {
      setSelectedId(themeId);
      setLocalCustom(customTheme);
      if (themeId === 'custom') {
        setActiveTab('custom');
      }
    }
  }, [isThemeModalOpen, themeId, customTheme]);

  if (!isThemeModalOpen) return null;

  const handleSelectPreset = (id: ThemePresetId) => {
    setSelectedId(id);
    // Instant preview without waiting
    setTheme(id, localCustom, false);
  };

  const handleCustomColorChange = (key: keyof CustomThemeConfig, value: string) => {
    const updated = { ...localCustom, [key]: value };
    setLocalCustom(updated);
    setSelectedId('custom');
    // Instant preview
    setTheme('custom', updated, false);
  };

  const handleSaveAndClose = async () => {
    try {
      await setTheme(selectedId, localCustom, true);
      toast.success(
        language === 'bn' 
          ? 'থিম সফলভাবে সংরক্ষিত ও প্রয়োগ করা হয়েছে!' 
          : 'Theme successfully saved and applied to your account!',
        'Theme Updated'
      );
      setIsThemeModalOpen(false);
    } catch (e) {
      toast.error('Failed to save theme', 'Error');
    }
  };

  const handleResetDefault = async () => {
    setSelectedId('emerald');
    setActiveTab('presets');
    await setTheme('emerald', undefined, true);
    toast.info(
      language === 'bn' 
        ? 'ডিফল্ট রাজকীয় পান্না থিমে রিসেট করা হয়েছে।' 
        : 'Reset to default Emerald & Gold theme.',
      'Theme Reset'
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 p-[2px] shadow-lg shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Palette className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="font-serif font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <span>{language === 'bn' ? 'ওয়েবসাইট থিম ও কালার কাস্টমাইজেশন' : 'Website Theme & Color Palette'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Live 0ms
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn' 
                  ? '৫টি প্রফেশনাল থিম থেকে বেছে নিন বা নিজের মনের মতো কালার এডিট করুন। আপনার আইডিতে সেভ থাকবে।' 
                  : 'Choose from 5 curated luxury presets or customize your own colors. Persisted to your user ID.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-2 border-b border-slate-800/60 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? '৫টি লাক্সারি প্রিসেট' : '5 Curated Presets'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('custom');
              setSelectedId('custom');
              setTheme('custom', localCustom, false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'কাস্টম কালার এডিটর' : 'Customize & Edit Colors'}</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'presets' ? (
            /* 5 Presets Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {presets.map((preset) => {
                const isSelected = selectedId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-slate-950 border-amber-400/80 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Tag & Active Check */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                        {preset.tag}
                      </span>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <Check className="w-3 h-3 text-amber-400" />
                          <span>Active</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Preset Name */}
                    <h3 className="font-bold text-white text-sm mb-1">
                      {language === 'bn' ? preset.nameBn : preset.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                      {language === 'bn' ? preset.descriptionBn : preset.description}
                    </p>

                    {/* Dual Swatch Bar */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded-full shadow-inner border border-white/20"
                          style={{ backgroundColor: preset.primary }}
                          title={`Primary: ${preset.primary}`}
                        />
                        <div 
                          className="w-5 h-5 rounded-full shadow-inner border border-white/20"
                          style={{ backgroundColor: preset.accent }}
                          title={`Accent: ${preset.accent}`}
                        />
                        <div 
                          className="w-5 h-5 rounded-full shadow-inner border border-white/20"
                          style={{ backgroundColor: preset.bgBase }}
                          title={`Background: ${preset.bgBase}`}
                        />
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono group-hover:text-amber-400 transition-colors flex items-center gap-1">
                        <span>{language === 'bn' ? 'প্রয়োগ করুন' : 'Preview'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Custom Color Editor */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      {language === 'bn' ? 'কালার প্যালেট কাস্টমাইজ করুন' : 'Fine-Tune Color Values'}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Instant Live Preview
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Color Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>{language === 'bn' ? 'ব্র্যান্ড প্রাইমারি কালার:' : 'Brand Primary Color:'}</span>
                      <span className="font-mono text-emerald-400 text-[11px]">{localCustom.primary}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localCustom.primary}
                        onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={localCustom.primary}
                        onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                        placeholder="#10b981"
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400 uppercase"
                      />
                    </div>
                  </div>

                  {/* Accent Color Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>{language === 'bn' ? 'হাইলাইট এক্সেন্ট কালার:' : 'Highlight Accent Color:'}</span>
                      <span className="font-mono text-amber-400 text-[11px]">{localCustom.accent}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localCustom.accent}
                        onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={localCustom.accent}
                        onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                        placeholder="#f59e0b"
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Dark Background Presets */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {language === 'bn' ? 'ডিপ ব্যাকগ্রাউন্ড শেড নির্বাচন করুন:' : 'Select Deep Background Shade:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {DARK_BG_PRESETS.map((bg) => (
                      <button
                        key={bg.hex}
                        type="button"
                        onClick={() => handleCustomColorChange('bg', bg.hex)}
                        className={`p-2 rounded-xl text-[11px] font-semibold border flex items-center gap-2 transition-all ${
                          localCustom.bg === bg.hex
                            ? 'border-amber-400 text-white bg-slate-900 shadow-md ring-1 ring-amber-400/40'
                            : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900/50'
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: bg.hex }}
                        />
                        <span className="truncate">{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Heading Typography Selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {language === 'bn' ? 'হেডিং ফন্ট ও টাইপোগ্রাফি স্টাইল:' : 'Heading Typography Style:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {FONT_PRESETS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => handleCustomColorChange('fontHeading' as any, f.value)}
                        className={`p-2 rounded-xl text-[11px] font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                          localCustom.fontHeading === f.value
                            ? 'border-amber-400 text-white bg-slate-900 shadow-md ring-1 ring-amber-400/40'
                            : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900/50'
                        }`}
                      >
                        <span className="font-bold text-xs" style={{ fontFamily: f.value }}>Aa</span>
                        <span className="truncate text-[10px] text-center">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Demo Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  {language === 'bn' ? 'লাইভ প্রিভিউ কম্পোনেন্ট' : 'Live Interactive Component Preview'}
                </span>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">
                      {language === 'bn' ? 'ব্যক্তিগত ক্যাটারিং ব্যালেন্স' : 'Current Catering Balance'}
                    </span>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      ৳{(Number(user?.balance) || 0).toFixed(2)}
                    </p>
                    <span className={`text-[10px] font-medium ${(Number(user?.balance) || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {(Number(user?.balance) || 0) > 0
                        ? (language === 'bn' ? '● অর্ডারের জন্য প্রস্তুত' : '● Available for orders')
                        : (language === 'bn' ? '● ওয়ালেট ব্যালেন্স শূন্য' : '● Zero available balance')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105"
                    >
                      + {language === 'bn' ? 'খাবার অর্ডার' : 'Add New Order'}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-slate-800 text-amber-300 font-semibold text-xs border border-amber-500/30"
                    >
                      {language === 'bn' ? 'হিসাব অডিট' : 'Audit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {user ? (
              <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? `অ্যাকাউন্টে সংরক্ষিত হবে: ${user.email}` : `Synced to: ${user.email}`}</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                {language === 'bn' ? 'লগইন করলে আপনার অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে সেভ থাকবে' : 'Sign in to permanently sync with account'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ডিফল্ট' : 'Reset'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndClose}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>{language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সেভ ও প্রয়োগ করুন' : 'Save & Apply Theme'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
