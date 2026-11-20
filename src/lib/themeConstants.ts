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
    bgBase: '#030712',         // obsidian slate-950
    bgCard: '#0b1120',         // midnight slate-900
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Inter', system-ui, sans-serif",
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
    fontHeading: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
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
    fontHeading: "'Cinzel', 'Playfair Display', Georgia, serif",
    fontBody: "'Inter', system-ui, sans-serif",
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
    fontHeading: "'Cinzel', 'Playfair Display', Georgia, serif",
    fontBody: "'Inter', system-ui, sans-serif",
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
    fontHeading: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
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
  bgCardHex: string = '#0b1120',
  fontHeading: string = "'Playfair Display', Georgia, serif",
  fontBody: string = "'Inter', system-ui, sans-serif"
): string {
  const primaryRgb = hexToRgb(primaryHex).rgbString;
  const accentRgb = hexToRgb(accentHex).rgbString;
  const bgBaseRgb = hexToRgb(bgBaseHex).rgbString;
  const bgCardRgb = hexToRgb(bgCardHex).rgbString;

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
  --theme-bg-base-rgb: ${bgBaseRgb};
  --theme-bg-card: ${bgCardHex};
  --theme-bg-card-rgb: ${bgCardRgb};

  --theme-font-heading: ${fontHeading};
  --theme-font-body: ${fontBody};
}

/* ========================================================
   1. TYPOGRAPHY & EXECUTIVE FONT STYLING
======================================================== */
h1, h2, h3, h4, .font-serif, [class*="font-serif"], .font-display, [class*="font-display"] {
  font-family: var(--theme-font-heading) !important;
}

body {
  font-family: var(--theme-font-body);
  background-color: var(--theme-bg-base) !important;
  transition: background-color 0.25s ease-in-out;
}

::selection {
  background-color: var(--theme-primary) !important;
  color: #030712 !important;
}

/* ========================================================
   2. PAGE, CARDS, DRAWERS & SECTIONS BACKGROUNDS
======================================================== */
/* All page roots and background divs */
.bg-slate-950,
main[class*="bg-slate-950"],
div[class*="bg-slate-950"] {
  background-color: var(--theme-bg-base) !important;
}

/* All cards, widgets, metrics, sidebars and panels */
.bg-slate-900,
.bg-slate-900\/95,
.bg-slate-900\/90,
.bg-slate-900\/80,
.bg-slate-900\/70,
.bg-slate-900\/60,
.bg-slate-900\/50,
[class*="bg-slate-900"] {
  background-color: var(--theme-bg-card) !important;
}

/* Recessed card sub-containers & table inner areas */
.bg-slate-950\/70,
.bg-slate-950\/80,
.bg-slate-950\/90,
.bg-slate-950\/95,
[class*="bg-slate-950\/"] {
  background-color: var(--theme-bg-base) !important;
}

/* Hero Cards with gradients */
.from-emerald-950.via-slate-900.to-emerald-950,
.from-emerald-950.via-slate-950.to-emerald-950,
.from-emerald-950.via-slate-950.to-slate-950 {
  background-image: linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.28), var(--theme-bg-card), rgba(var(--theme-accent-rgb), 0.22)) !important;
}

/* ========================================================
   3. TAILWIND GRADIENT ENGINE OVERRIDES (ALL BUTTONS, TABS & ACCENTS)
======================================================== */
/* Solid CTA & Button Gradients */
button[class*="from-emerald-"],
button[class*="from-teal-"],
a[class*="from-emerald-"],
a[class*="from-teal-"],
[role="button"][class*="from-emerald-"],
[role="button"][class*="from-teal-"],
div[class*="p-[2px]"][class*="from-emerald-"],
div[class*="p-[2px]"][class*="from-teal-"] {
  --tw-gradient-from: var(--theme-primary) var(--tw-gradient-from-position) !important;
  --tw-gradient-to: rgba(var(--theme-primary-rgb), 0) var(--tw-gradient-to-position) !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

button[class*="from-amber-"],
button[class*="from-gold-"],
a[class*="from-amber-"],
a[class*="from-gold-"],
[role="button"][class*="from-amber-"],
[role="button"][class*="from-gold-"],
div[class*="p-[2px]"][class*="from-amber-"],
div[class*="p-[2px]"][class*="from-gold-"] {
  --tw-gradient-from: var(--theme-accent) var(--tw-gradient-from-position) !important;
  --tw-gradient-to: rgba(var(--theme-accent-rgb), 0) var(--tw-gradient-to-position) !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

button[class*="to-amber-"],
button[class*="to-gold-"],
a[class*="to-amber-"],
a[class*="to-gold-"] {
  --tw-gradient-to: var(--theme-accent) var(--tw-gradient-to-position) !important;
}

button[class*="to-emerald-"],
button[class*="to-teal-"],
a[class*="to-emerald-"],
a[class*="to-teal-"] {
  --tw-gradient-to: var(--theme-primary) var(--tw-gradient-to-position) !important;
}

button[class*="via-emerald-"],
button[class*="via-teal-"],
a[class*="via-emerald-"],
a[class*="via-teal-"] {
  --tw-gradient-stops: var(--tw-gradient-from), var(--theme-primary-light) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;
}

button[class*="via-amber-"],
a[class*="via-amber-"] {
  --tw-gradient-stops: var(--tw-gradient-from), var(--theme-accent-light) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;
}

/* Translucent Gradient Glows for Cards & Badges (NEVER 100% solid, soft subtle tint) */
[class*="from-emerald-500\/"],
[class*="from-teal-500\/"] {
  --tw-gradient-from: rgba(var(--theme-primary-rgb), 0.12) var(--tw-gradient-from-position) !important;
  --tw-gradient-to: rgba(var(--theme-primary-rgb), 0) var(--tw-gradient-to-position) !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

[class*="to-teal-500\/"],
[class*="to-emerald-500\/"] {
  --tw-gradient-to: rgba(var(--theme-primary-rgb), 0.06) var(--tw-gradient-to-position) !important;
}

[class*="from-amber-500\/"],
[class*="from-orange-500\/"],
[class*="from-yellow-500\/"] {
  --tw-gradient-from: rgba(var(--theme-accent-rgb), 0.12) var(--tw-gradient-from-position) !important;
  --tw-gradient-to: rgba(var(--theme-accent-rgb), 0) var(--tw-gradient-to-position) !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

[class*="to-amber-500\/"],
[class*="to-orange-500\/"],
[class*="to-yellow-500\/"] {
  --tw-gradient-to: rgba(var(--theme-accent-rgb), 0.06) var(--tw-gradient-to-position) !important;
}

/* Deep Card Gradients - 18-24% opacity luxury glow over dark card base */
[class*="from-emerald-950"],
[class*="from-teal-950"] {
  --tw-gradient-from: rgba(var(--theme-primary-rgb), 0.22) var(--tw-gradient-from-position) !important;
  --tw-gradient-to: rgba(var(--theme-primary-rgb), 0) var(--tw-gradient-to-position) !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

[class*="to-emerald-950"],
[class*="to-teal-950"] {
  --tw-gradient-to: rgba(var(--theme-primary-rgb), 0.18) var(--tw-gradient-to-position) !important;
}

[class*="from-amber-950"] {
  --tw-gradient-from: rgba(var(--theme-accent-rgb), 0.22) var(--tw-gradient-from-position) !important;
  --tw-gradient-to: rgba(var(--theme-accent-rgb), 0) var(--tw-gradient-to-position) !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

[class*="to-amber-950"] {
  --tw-gradient-to: rgba(var(--theme-accent-rgb), 0.18) var(--tw-gradient-to-position) !important;
}

/* ========================================================
   4. SOLID BUTTONS, TAB BUTTONS & PILLS
======================================================== */
/* Solid Primary Buttons & Active Tab Buttons (Orders status, Super Admin, Chat, etc.) */
.bg-emerald-600,
.bg-emerald-500,
.bg-teal-600,
.bg-teal-500,
button[class*="bg-emerald-600"],
button[class*="bg-emerald-500"],
button[class*="bg-teal-600"],
button[class*="bg-teal-500"] {
  background-color: var(--theme-primary) !important;
  color: #030712 !important;
}

/* Solid Accent Buttons & Active Filter Tabs (Department tabs, Category pills, etc.) */
.bg-amber-400,
.bg-amber-500,
.bg-gold-500,
.bg-gold-400,
button[class*="bg-amber-400"],
button[class*="bg-amber-500"],
button[class*="bg-gold-400"],
button[class*="bg-gold-500"] {
  background-color: var(--theme-accent) !important;
  color: #030712 !important;
}

/* Button Hovers */
.hover\:bg-emerald-500:hover,
.hover\:bg-emerald-600:hover,
.hover\:bg-emerald-700:hover,
button[class*="hover:bg-emerald"]:hover {
  background-color: var(--theme-primary-hover) !important;
}

.hover\:bg-amber-300:hover,
.hover\:bg-amber-400:hover,
.hover\:bg-amber-500:hover,
button[class*="hover:bg-amber"]:hover {
  background-color: var(--theme-accent-hover) !important;
}

/* Subtle Action Buttons (PNG receipt, icon actions, custom buttons) */
.bg-emerald-950,
.bg-emerald-950\/60,
.bg-emerald-950\/80,
button[class*="bg-emerald-950"],
.hover\:bg-emerald-900:hover,
.hover\:bg-emerald-900\/60:hover {
  background-color: rgba(var(--theme-primary-rgb), 0.22) !important;
  color: var(--theme-primary-light) !important;
}

.bg-amber-950,
.bg-amber-950\/40,
.bg-amber-950\/60,
button[class*="bg-amber-950"],
.hover\:bg-amber-900\/60:hover {
  background-color: rgba(var(--theme-accent-rgb), 0.22) !important;
  color: var(--theme-accent-light) !important;
}

/* Inactive Tab Hover Subtle Theme Glow */
.text-slate-400.hover\:text-white:hover,
.text-slate-400.hover\:text-slate-200:hover {
  color: var(--theme-primary-light) !important;
}

/* ========================================================
   5. ALL HIGHLIGHTED TEXT & HIGH-CONTRAST CARD READABILITY
======================================================== */
.text-emerald-400,
.text-emerald-300,
.text-emerald-500,
.text-teal-400,
.text-teal-300,
[class*="text-emerald-400"],
[class*="text-emerald-300"],
[class*="text-emerald-500"],
[class*="text-teal-400"],
[class*="text-teal-300"] {
  color: var(--theme-primary-light) !important;
}

.text-amber-400,
.text-amber-300,
.text-amber-200,
.text-gold-400,
[class*="text-amber-400"],
[class*="text-amber-300"],
[class*="text-amber-200"],
[class*="text-gold-400"] {
  color: var(--theme-accent-light) !important;
}

/* Card titles, headers & label text contrast enhancements across all themes */
.text-slate-100 {
  color: #ffffff !important;
}

.text-slate-200 {
  color: #f1f5f9 !important;
}

.text-slate-300 {
  color: #e2e8f0 !important;
}

/* Muted subtitles & labels - lifted to high-contrast readable silver */
.text-slate-400 {
  color: #cbd5e1 !important;
}

.text-slate-500 {
  color: #94a3b8 !important;
}

.group:hover .group-hover\:text-amber-300,
.group:hover .group-hover\:text-amber-400 {
  color: var(--theme-accent-light) !important;
}

.group:hover .group-hover\:text-emerald-300,
.group:hover .group-hover\:text-emerald-400 {
  color: var(--theme-primary-light) !important;
}

/* ========================================================
   6. BORDERS, DIVIDERS & GLOW ACCENTS
======================================================== */
[class*="border-emerald-"],
[class*="border-teal-"] {
  border-color: rgba(var(--theme-primary-rgb), 0.38) !important;
}

[class*="border-amber-"],
[class*="border-gold-"] {
  border-color: rgba(var(--theme-accent-rgb), 0.38) !important;
}

.border-slate-800,
.border-slate-800\/80,
.border-slate-800\/60,
.border-slate-700,
.border-slate-700\/80 {
  border-color: rgba(var(--theme-primary-rgb), 0.16) !important;
}

/* ========================================================
   7. SOFT TINTS, BADGES & STATUS INDICATORS
======================================================== */
[class*="bg-emerald-500\/10"],
[class*="bg-emerald-500\/20"] {
  background-color: rgba(var(--theme-primary-rgb), 0.16) !important;
}

[class*="bg-amber-500\/10"],
[class*="bg-amber-500\/20"] {
  background-color: rgba(var(--theme-accent-rgb), 0.16) !important;
}

.bg-emerald-400,
.bg-teal-400,
[class*="bg-emerald-400"] {
  background-color: var(--theme-primary-light) !important;
}

/* ========================================================
   8. INPUTS, FOCUS STATES & RINGS
======================================================== */
input:focus, select:focus, textarea:focus,
.focus\:border-amber-400:focus,
.focus\:border-emerald-500:focus,
.focus\:border-emerald-400:focus {
  border-color: var(--theme-accent) !important;
  box-shadow: 0 0 0 1px var(--theme-accent) !important;
}

input, select, textarea {
  background-color: rgba(var(--theme-bg-base-rgb), 0.85) !important;
  border-color: rgba(var(--theme-primary-rgb), 0.28) !important;
}

[class*="ring-amber-"],
[class*="ring-emerald-"] {
  --tw-ring-color: rgba(var(--theme-accent-rgb), 0.45) !important;
}

.shadow-emerald-950\/40,
.shadow-emerald-950\/60 {
  --tw-shadow-color: rgba(var(--theme-primary-rgb), 0.25) !important;
}

/* ========================================================
   9. SCROLLBARS & CONTROLS
======================================================== */
::-webkit-scrollbar-track {
  background: var(--theme-bg-base) !important;
}

::-webkit-scrollbar-thumb {
  background: rgba(var(--theme-primary-rgb), 0.45) !important;
  border-color: var(--theme-bg-base) !important;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--theme-primary) !important;
}
`;
}
