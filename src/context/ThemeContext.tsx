'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { ThemePreset, ThemePresetId, CustomThemeConfig } from '@/lib/types';
import { THEME_PRESETS, generateThemeCSS, isLightColor } from '@/lib/themeConstants';

interface ThemeContextType {
  themeId: ThemePresetId;
  customTheme: CustomThemeConfig;
  activeTheme: ThemePreset;
  presets: ThemePreset[];
  setTheme: (id: ThemePresetId, custom?: CustomThemeConfig, saveToDb?: boolean) => Promise<void>;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
  isSaving: boolean;
}

const LOCAL_STORAGE_KEY = 'shopify_catering_theme';

const defaultCustomTheme: CustomThemeConfig = {
  primary: '#10b981',
  accent: '#f59e0b',
  bg: '#030712',
  card: '#0b1120',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [themeId, setThemeIdState] = useState<ThemePresetId>('emerald');
  const [customTheme, setCustomThemeState] = useState<CustomThemeConfig>(defaultCustomTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Compute active theme values
  const activeTheme = useMemo<ThemePreset>(() => {
    if (themeId === 'custom') {
      return {
        id: 'custom',
        name: 'Custom Tailored Theme',
        nameBn: 'কাস্টম পছন্দের থিম',
        description: 'Personalized primary & accent palette tailored to your account',
        descriptionBn: 'আপনার অ্যাকাউন্টের জন্য ব্যক্তিগত পছন্দের কালার প্যালেট',
        tag: 'Customized Palette',
        primary: customTheme.primary,
        primaryLight: customTheme.primary,
        primaryDark: customTheme.primary,
        primaryRgb: '16, 185, 129',
        accent: customTheme.accent,
        accentLight: customTheme.accent,
        accentDark: customTheme.accent,
        accentRgb: '245, 158, 11',
        bgBase: customTheme.bg || '#030712',
        bgCard: customTheme.card || '#0b1120',
        fontHeading: customTheme.fontHeading || "'Playfair Display', Georgia, serif",
        fontBody: customTheme.fontBody || "'Inter', system-ui, sans-serif",
        previewGradient: 'from-amber-500 to-emerald-500',
      };
    }
    const found = THEME_PRESETS.find(p => p.id === themeId);
    return found || THEME_PRESETS[0];
  }, [themeId, customTheme]);

  // Inject CSS rules dynamically into document head
  const applyCSS = (id: ThemePresetId, custom: CustomThemeConfig) => {
    if (typeof document === 'undefined') return;

    let primary = '#10b981';
    let accent = '#f59e0b';
    let bg = '#030712';
    let card = '#0b1120';
    let fontHeading = "'Playfair Display', Georgia, serif";
    let fontBody = "'Inter', system-ui, sans-serif";

    if (id === 'custom') {
      primary = custom.primary || '#10b981';
      accent = custom.accent || '#f59e0b';
      bg = custom.bg || '#030712';
      card = custom.card || '#0b1120';
      fontHeading = custom.fontHeading || "'Playfair Display', Georgia, serif";
      fontBody = custom.fontBody || "'Inter', system-ui, sans-serif";
    } else {
      const preset = THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
      primary = preset.primary;
      accent = preset.accent;
      bg = preset.bgBase;
      card = preset.bgCard;
      fontHeading = preset.fontHeading || "'Playfair Display', Georgia, serif";
      fontBody = preset.fontBody || "'Inter', system-ui, sans-serif";
    }

    const css = generateThemeCSS(primary, accent, bg, card, fontHeading, fontBody);
    let styleTag = document.getElementById('shopify-theme-customizer') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'shopify-theme-customizer';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = css;
    document.documentElement.setAttribute('data-theme', id);
    const isLight = isLightColor(bg);
    document.documentElement.setAttribute('data-mode', isLight ? 'light' : 'dark');
    if (isLight) {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
    }
  };

  // 1. Initial hydration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.themeId) {
          setThemeIdState(parsed.themeId);
          if (parsed.customTheme) setCustomThemeState(parsed.customTheme);
          applyCSS(parsed.themeId, parsed.customTheme || defaultCustomTheme);
        }
      } else {
        applyCSS('emerald', defaultCustomTheme);
      }
    } catch (e) {
      console.warn('Theme storage hydration warning:', e);
      applyCSS('emerald', defaultCustomTheme);
    }
    setHasHydrated(true);
  }, []);

  // 2. Sync with Authenticated User Profile from Database
  useEffect(() => {
    if (user && hasHydrated) {
      const userTheme = (user as any).themeColor as ThemePresetId | undefined;
      const userCustom = (user as any).customTheme as CustomThemeConfig | undefined;

      if (userTheme && (userTheme !== themeId || userCustom)) {
        setThemeIdState(userTheme);
        if (userCustom) setCustomThemeState(userCustom);
        applyCSS(userTheme, userCustom || defaultCustomTheme);
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({ themeId: userTheme, customTheme: userCustom || defaultCustomTheme })
        );
      }
    }
  }, [user?.uid, user?.themeColor]);

  // Set & Save Theme function
  const setTheme = async (id: ThemePresetId, custom?: CustomThemeConfig, saveToDb = true) => {
    const nextCustom = custom || customTheme;
    setThemeIdState(id);
    if (custom) setCustomThemeState(custom);

    // Apply instantly with 0ms delay
    applyCSS(id, nextCustom);

    // Save to localStorage immediately
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ themeId: id, customTheme: nextCustom })
      );
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }

    // Persist to user's MongoDB Atlas profile if logged in
    if (saveToDb && user && (user.uid || user.email)) {
      setIsSaving(true);
      try {
        await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email,
            themeColor: id,
            customTheme: nextCustom,
          }),
        });
        if (refreshUser) {
          await refreshUser();
        }
      } catch (err) {
        console.error('Failed to sync theme with account profile:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        customTheme,
        activeTheme,
        presets: THEME_PRESETS,
        setTheme,
        isThemeModalOpen,
        setIsThemeModalOpen,
        isSaving,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
