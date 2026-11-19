import { ThemePreset, ThemePresetId, CustomThemeConfig } from './types';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'emerald',
    name: 'Emerald & Imperial Gold',
    nameBn: 'রাজকীয় পান্না ও স্বর্ণ',
    description: 'Classic luxury executive emerald green with warm imperial gold highlights',
    descriptionBn: 'ক্লাসিক এক্সিকিউটিভ ডার্ক পান্না ও সোনালী আভার কম্বিনেশন',
    tag: 'Signature Executive',
    primary: '#10b981',        // emerald-500
    primaryLight: '#34d399',   // emerald-400
    primaryDark: '#047857',    // emerald-700
    primaryRgb: '16, 185, 129',
    accent: '#f59e0b',         // amber-500
    accentLight: '#fbbf24',    // amber-400
    accentDark: '#b45309',     // amber-700
    accentRgb: '245, 158, 11',
    bgBase: '#030712',         // slate-950
    bgCard: '#0b1120',         // slate-900
    previewGradient: 'from-emerald-500 to-amber-500',
  },
  {
    id: 'sapphire',
    name: 'Sapphire & Rose Quartz',
    nameBn: 'নীলকান্তমণি ও সাইবার রোজ',
    description: 'Electric cyan sapphire blue paired with glowing neon rose quartz highlights',
    descriptionBn: 'মডার্ন হাইটেক সায়ান ব্লু ও ভাইব্রেন্ট রোজ পিঙ্ক কম্বিনেশন',
    tag: 'Cyber Neon High-Tech',
    primary: '#06b6d4',        // cyan-500
    primaryLight: '#38bdf8',   // sky-400
    primaryDark: '#0e7490',    // cyan-700
    primaryRgb: '6, 182, 212',
    accent: '#f43f5e',         // rose-500
    accentLight: '#fb7185',    // rose-400
    accentDark: '#be123c',     // rose-700
    accentRgb: '244, 63, 94',
    bgBase: '#030717',         // deep midnight blue
    bgCard: '#070f2b',         // deep navy
    previewGradient: 'from-cyan-500 to-rose-500',
  },
  {
    id: 'amethyst',
    name: 'Amethyst & Sunset Gold',
    nameBn: 'রাজকীয় ভায়োলেট ও সানসেট গোল্ড',
    description: 'Regal velvet amethyst purple paired with warm sunset tangerine glow',
    descriptionBn: 'রাজকীয় বেগুনি ও সানসেট ট্যানজারিন গোল্ডেন কালার কম্বিনেশন',
    tag: 'Royal Velvet Luxury',
    primary: '#8b5cf6',        // violet-500
    primaryLight: '#a78bfa',   // violet-400
    primaryDark: '#6d28d9',    // violet-700
    primaryRgb: '139, 92, 246',
    accent: '#f97316',         // orange-500
    accentLight: '#fb923c',    // orange-400
    accentDark: '#c2410c',     // orange-700
    accentRgb: '249, 115, 22',
    bgBase: '#090514',         // deep amethyst black
    bgCard: '#130a28',         // velvet plum
    previewGradient: 'from-violet-500 to-orange-500',
  },
  {
    id: 'ruby',
    name: 'Ruby & 24K Gold',
    nameBn: 'রক্তিম রুবি ও ২৪কে স্বর্ণ',
    description: 'Passionate crimson ruby paired with pure radiant 24-karat gold shimmer',
    descriptionBn: 'আভিজাত্যপূর্ণ রক্তিম রুবি ও খাঁটি চকচকে স্বর্ণের যুগলবন্দী',
    tag: 'Imperial Scarlet',
    primary: '#ef4444',        // red-500
    primaryLight: '#f87171',   // red-400
    primaryDark: '#b91c1c',    // red-700
    primaryRgb: '239, 68, 68',
    accent: '#eab308',         // yellow-500
    accentLight: '#fde047',    // yellow-400
    accentDark: '#a16207',     // yellow-700
    accentRgb: '234, 179, 8',
    bgBase: '#0f0507',         // garnet obsidian
    bgCard: '#1d090f',         // deep ruby slate
    previewGradient: 'from-red-500 to-yellow-500',
  },
  {
    id: 'arctic',
    name: 'Ocean Teal & Neon Lime',
    nameBn: 'মেরিন টিল ও ইলেকট্রিক নিয়ন লাইম',
    description: 'Crisp deep ocean teal paired with high-energy radiant neon mint highlights',
    descriptionBn: 'প্রাণবন্ত গভীর সমুদ্র টিল ও ইলেকট্রিক নিয়ন লাইম কম্বিনেশন',
    tag: 'Clean Energy & Mint',
    primary: '#14b8a6',        // teal-500
    primaryLight: '#2dd4bf',   // teal-400
    primaryDark: '#0f766e',    // teal-700
    primaryRgb: '20, 184, 166',
    accent: '#84cc16',         // lime-500
    accentLight: '#a3e635',    // lime-400
    accentDark: '#4d7c0f',     // lime-700
    accentRgb: '132, 204, 22',
    bgBase: '#020b08',         // abyssal forest
    bgCard: '#051912',         // ocean spruce
    previewGradient: 'from-teal-500 to-lime-500',
  },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number; rgbString: string } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 16, g: 185, b: 129, rgbString: '16, 185, 129' };
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b, rgbString: `${r}, ${g}, ${b}` };
}

export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

export function generateThemeCSS(
  primaryHex: string,
  accentHex: string,
  bgBaseHex: string = '#030712',
  bgCardHex: string = '#0b1120'
): string {
  const primaryRgb = hexToRgb(primaryHex).rgbString;
  const accentRgb = hexToRgb(accentHex).rgbString;

  const primaryLight = adjustBrightness(primaryHex, 20);
  const primaryDark = adjustBrightness(primaryHex, -25);
  const accentLight = adjustBrightness(accentHex, 20);
  const accentDark = adjustBrightness(accentHex, -25);

  return `
:root {
  --theme-primary: ${primaryHex};
  --theme-primary-hover: ${primaryDark};
  --theme-primary-light: ${primaryLight};
  --theme-primary-dark: ${primaryDark};
  --theme-primary-rgb: ${primaryRgb};

  --theme-accent: ${accentHex};
  --theme-accent-hover: ${accentDark};
  --theme-accent-light: ${accentLight};
  --theme-accent-dark: ${accentDark};
  --theme-accent-rgb: ${accentRgb};

  --theme-bg-base: ${bgBaseHex};
  --theme-bg-card: ${bgCardHex};
}

/* Base Body Background & Selection */
body {
  background-color: var(--theme-bg-base) !important;
  transition: background-color 0.25s ease-in-out;
}
::selection {
  background-color: var(--theme-primary) !important;
  color: #030712 !important;
}

/* Gradients */
.from-emerald-600.to-amber-600,
.from-emerald-500.to-amber-500,
.from-emerald-700.to-amber-600,
.from-emerald-800.to-emerald-600,
.from-emerald-950.via-slate-950.to-slate-950 {
  background-image: linear-gradient(135deg, var(--theme-primary), var(--theme-accent)) !important;
}

/* Primary Text Highlights */
.text-emerald-400,
.text-emerald-300,
.text-emerald-500,
.text-teal-400,
.text-teal-300 {
  color: var(--theme-primary-light) !important;
}

/* Accent/Gold Text Highlights */
.text-amber-400,
.text-amber-300,
.text-amber-200,
.text-gold-400 {
  color: var(--theme-accent-light) !important;
}

/* Border Highlights */
.border-emerald-500\\/30,
.border-emerald-500\\/40,
.border-emerald-500\\/50,
.border-emerald-600\\/30,
.border-emerald-700\\/60,
.border-emerald-800,
.border-emerald-900\\/40,
.border-teal-500\\/30 {
  border-color: rgba(var(--theme-primary-rgb), 0.35) !important;
}

.border-amber-500\\/30,
.border-amber-500\\/40,
.border-amber-500\\/50,
.border-amber-600\\/30,
.border-amber-500\\/20 {
  border-color: rgba(var(--theme-accent-rgb), 0.35) !important;
}

/* Soft Tint Backgrounds */
.bg-emerald-500\\/10,
.bg-emerald-500\\/20,
.bg-emerald-950,
.bg-emerald-950\\/60,
.bg-emerald-950\\/80,
.bg-emerald-950\\/90 {
  background-color: rgba(var(--theme-primary-rgb), 0.16) !important;
}

.bg-amber-500\\/10,
.bg-amber-500\\/20,
.bg-amber-950,
.bg-amber-950\\/40 {
  background-color: rgba(var(--theme-accent-rgb), 0.16) !important;
}

/* Solid Buttons & State Toggles */
.bg-emerald-600,
.hover\\:bg-emerald-600:hover,
.hover\\:bg-emerald-500:hover {
  background-color: var(--theme-primary) !important;
}

.bg-amber-400,
.hover\\:bg-amber-500:hover,
.hover\\:bg-amber-400:hover {
  background-color: var(--theme-accent) !important;
}

/* Rings & Focus States */
.ring-emerald-500\\/30,
.ring-emerald-500\\/40,
.ring-emerald-500 {
  --tw-ring-color: rgba(var(--theme-primary-rgb), 0.45) !important;
}

.focus\\:border-amber-400:focus,
.focus\\:border-emerald-500:focus {
  border-color: var(--theme-primary) !important;
}

/* Scrollbars */
::-webkit-scrollbar-thumb {
  background: rgba(var(--theme-primary-rgb), 0.45) !important;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--theme-primary) !important;
}
`;
}
