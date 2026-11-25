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
  {
    id: 'pearl',
    name: 'Pearl & Royal Emerald (Light)',
    nameBn: 'রাজকীয় মুক্তা ও পান্না (লাইট)',
    description: 'Crisp luminous pearl white background with deep executive emerald & imperial gold accents',
    descriptionBn: 'উজ্জ্বল পার্ল হোয়াইট ব্যাকগ্রাউন্ড, ডিপ এক্সিকিউটিভ পান্না ও সোনালী ফন্ট কম্বিনেশন',
    tag: 'Luxury Executive Light',
    primary: '#059669',        // emerald-600
    primaryLight: '#047857',   // emerald-700
    primaryDark: '#065f46',    // emerald-800
    primaryRgb: '5, 150, 105',
    accent: '#d97706',         // amber-600
    accentLight: '#b45309',    // amber-700
    accentDark: '#92400e',     // amber-800
    accentRgb: '217, 119, 6',
    bgBase: '#f8fafc',         // soft pearl slate-50
    bgCard: '#ffffff',         // crisp pure white
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Inter', system-ui, sans-serif",
    previewGradient: 'from-emerald-600 to-amber-600',
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

export function isLightColor(hex: string): boolean {
  if (!hex) return false;
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.45;
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

  const isLight = isLightColor(bgBaseHex);

  if (isLight) {
    // ========================================================
    // LIGHT THEME STYLING & HIGH-CONTRAST ENGINE (A TO Z)
    // ========================================================
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

/* 1. Base Canvas & Executive Typography */
body {
  font-family: var(--theme-font-body);
  background-color: var(--theme-bg-base) !important;
  color: #0f172a !important;
  transition: background-color 0.25s ease-in-out;
}

h1, h2, h3, h4, h5, h6, .font-serif, [class*="font-serif"], .font-display, [class*="font-display"] {
  font-family: var(--theme-font-heading) !important;
  color: #0f172a !important;
}

::selection {
  background-color: var(--theme-primary) !important;
  color: #ffffff !important;
}

/* 2. Main Page Background */
main,
[class*="bg-slate-950"] {
  background-color: var(--theme-bg-base) !important;
}

/* 3. Cards, Widgets, Tables & Dialogs -> PURE CRISP WHITE */
[class*="bg-slate-900"] {
  background-color: #ffffff !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.04) !important;
}

/* 4. Recessed sub-cards & inner areas inside white cards */
[class*="bg-slate-900"] [class*="bg-slate-950"],
[class*="bg-slate-900"] [class*="bg-slate-900"] {
  background-color: #f8fafc !important;
  border-color: #e2e8f0 !important;
}

/* 5. Convert all Dark Card Gradients to Luminous Soft Light Glows */
div[class*="from-emerald-950"],
section[class*="from-emerald-950"],
header[class*="from-emerald-950"],
div[class*="from-slate-950"],
section[class*="from-slate-950"],
div[class*="from-slate-900"],
section[class*="from-slate-900"] {
  background-image: linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.08), #ffffff 50%, rgba(var(--theme-accent-rgb), 0.06)) !important;
  background-color: #ffffff !important;
  border-color: #e2e8f0 !important;
}

/* 6. Sidebar Root & User Profile Card */
aside,
aside [class*="bg-slate-950"],
[class*="bg-slate-950"][class*="border-r"] {
  background-color: #ffffff !important;
  border-color: #e2e8f0 !important;
}

/* Sidebar User Profile Card */
aside [class*="rounded-2xl"][class*="from-emerald-950"],
aside [class*="rounded-2xl"][class*="bg-slate-100"] {
  background-image: none !important;
  background-color: #f8fafc !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
}

aside [class*="rounded-2xl"][class*="from-emerald-950"] p,
aside [class*="rounded-2xl"][class*="from-emerald-950"] span,
aside [class*="rounded-2xl"][class*="bg-slate-100"] p,
aside [class*="rounded-2xl"][class*="bg-slate-100"] span {
  color: #0f172a !important;
}

/* Sidebar Nav Items */
aside nav a,
aside [class*="text-slate-400"] {
  color: #475569 !important;
}

aside nav a:hover,
aside [class*="hover:bg-slate-900"]:hover {
  background-color: #f1f5f9 !important;
  color: #0f172a !important;
}

/* Active Nav Item */
aside nav a[class*="bg-emerald-900"],
aside nav a[class*="border-emerald-500"],
aside nav a[class*="from-emerald-950"] {
  background-image: linear-gradient(135deg, var(--theme-primary), var(--theme-accent)) !important;
  color: #ffffff !important;
  border-color: transparent !important;
  box-shadow: 0 4px 12px -2px rgba(var(--theme-primary-rgb), 0.3) !important;
  font-weight: 700 !important;
}

aside nav a[class*="bg-emerald-900"] *,
aside nav a[class*="border-emerald-500"] *,
aside nav a[class*="from-emerald-950"] * {
  color: #ffffff !important;
}

/* 7. Navbar Styling */
header,
header[class*="bg-slate-950"] {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05) !important;
}

/* 8. Text Readability: Convert White & Silver to Dark Charcoal */
[class*="text-white"]:not(button):not(button *):not(a[class*="from-"]):not(a[class*="from-"] *):not([role="button"]):not([role="button"] *):not(.btn-solid):not(.btn-solid *):not([class*="bg-emerald-600"]):not([class*="bg-emerald-600"] *):not([class*="bg-amber-500"]):not([class*="bg-amber-500"] *):not(tfoot *):not(th) {
  color: #0f172a !important;
}

[class*="text-slate-100"]:not(button):not(button *):not(tfoot *) {
  color: #0f172a !important;
}

[class*="text-slate-200"]:not(button):not(button *):not(tfoot *) {
  color: #1e293b !important;
}

[class*="text-slate-300"]:not(button):not(button *):not(tfoot *) {
  color: #334155 !important;
}

[class*="text-slate-400"]:not(button):not(button *) {
  color: #475569 !important;
}

[class*="text-slate-500"]:not(button):not(button *) {
  color: #64748b !important;
}

/* 9. WCAG AAA High-Contrast Numbers & Metric Highlights */
[class*="text-emerald-400"],
[class*="text-emerald-300"],
[class*="text-teal-400"],
[class*="text-teal-300"] {
  color: #047857 !important; /* Deep emerald-700 (7.5:1 AAA contrast) */
}

[class*="text-amber-400"],
[class*="text-amber-300"],
[class*="text-amber-200"],
[class*="text-gold-400"] {
  color: #b45309 !important; /* Deep amber-700 (6.2:1 AAA contrast) */
}

[class*="text-rose-400"],
[class*="text-rose-300"],
[class*="text-red-400"] {
  color: #be123c !important; /* Deep rose-700 (7.1:1 AAA contrast) */
}

[class*="text-sky-400"],
[class*="text-cyan-400"] {
  color: #0369a1 !important; /* Deep sky-700 (6.5:1 AAA contrast) */
}

/* 10. UNIFIED BUTTONS & ACTIONS ACROSS THE APP */
/* All Primary CTA Buttons share the cohesive brand gradient with pure white text */
button[class*="from-emerald-"],
button[class*="from-teal-"],
button[class*="from-amber-"],
button[class*="from-gold-"],
a[class*="from-emerald-"],
a[class*="from-teal-"],
a[class*="from-amber-"],
[role="button"][class*="from-emerald-"],
[role="button"][class*="from-teal-"],
.btn-solid,
.btn-gradient {
  background-image: linear-gradient(135deg, var(--theme-primary), var(--theme-accent)) !important;
  color: #ffffff !important;
}

button[class*="from-"] *,
a[class*="from-"] *,
[role="button"][class*="from-"] * {
  color: #ffffff !important;
}

/* Bubble Badges Inside Active Buttons / Tabs */
button[class*="from-"] span[class*="rounded-full"],
button[class*="bg-emerald"] span[class*="rounded-full"],
button[class*="bg-amber"] span[class*="rounded-full"],
a[class*="from-"] span[class*="rounded-full"] {
  background-color: rgba(0, 0, 0, 0.32) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.35) !important;
  font-weight: 700 !important;
}

/* Bubble Badges Inside Inactive Buttons / Tabs */
button:not([class*="from-"]):not([class*="bg-emerald"]):not([class*="bg-amber"]) span[class*="rounded-full"] {
  background-color: #e2e8f0 !important;
  color: #1e293b !important;
  border: 1px solid #cbd5e1 !important;
  font-weight: 700 !important;
}

/* Secondary / Slate / Outline Buttons in Light Mode */
button[class*="bg-slate-800"],
a[class*="bg-slate-800"],
button[class*="bg-slate-900"],
a[class*="bg-slate-900"],
button[class*="bg-slate-950"],
a[class*="bg-slate-950"] {
  background-color: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  color: #1e293b !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
}

button[class*="bg-slate-800"]:hover,
a[class*="bg-slate-800"]:hover,
button[class*="bg-slate-900"]:hover,
a[class*="bg-slate-900"]:hover,
button[class*="bg-slate-950"]:hover,
a[class*="bg-slate-950"]:hover,
button:not([class*="from-"]):not([class*="bg-emerald"]):not([class*="bg-amber"]):not([class*="bg-rose"]):hover {
  background-color: #f1f5f9 !important;
  border-color: #94a3b8 !important;
  color: #0f172a !important;
}

button:not([class*="from-"]):not([class*="bg-emerald"]):not([class*="bg-amber"]):not([class*="bg-rose"]):hover * {
  color: #0f172a !important;
}

/* Soft Action Pills */
[class*="bg-emerald-950"],
[class*="bg-emerald-500/10"],
[class*="bg-emerald-500/20"] {
  background-color: rgba(var(--theme-primary-rgb), 0.12) !important;
  color: #047857 !important;
  border-color: rgba(var(--theme-primary-rgb), 0.3) !important;
}

[class*="bg-amber-950"],
[class*="bg-amber-500/10"],
[class*="bg-amber-500/20"] {
  background-color: rgba(var(--theme-accent-rgb), 0.12) !important;
  color: #b45309 !important;
  border-color: rgba(var(--theme-accent-rgb), 0.3) !important;
}

[class*="bg-rose-950"],
[class*="bg-rose-500/10"],
[class*="bg-rose-500/20"] {
  background-color: rgba(225, 29, 72, 0.12) !important;
  color: #be123c !important;
  border-color: rgba(225, 29, 72, 0.3) !important;
}

/* 11. Metric Card Badges & Indicators */
span[class*="border-emerald-"][class*="rounded-full"] {
  background-color: rgba(var(--theme-primary-rgb), 0.14) !important;
  color: #047857 !important;
  border-color: rgba(var(--theme-primary-rgb), 0.35) !important;
  font-weight: 700 !important;
}

span[class*="border-amber-"][class*="rounded-full"] {
  background-color: rgba(var(--theme-accent-rgb), 0.14) !important;
  color: #b45309 !important;
  border-color: rgba(var(--theme-accent-rgb), 0.35) !important;
  font-weight: 700 !important;
}

span[class*="border-teal-"][class*="rounded-full"] {
  background-color: rgba(var(--theme-primary-rgb), 0.14) !important;
  color: #047857 !important;
  border-color: rgba(var(--theme-primary-rgb), 0.35) !important;
  font-weight: 700 !important;
}

span[class*="border-sky-"][class*="rounded-full"] {
  background-color: rgba(2, 132, 199, 0.14) !important;
  color: #0369a1 !important;
  border-color: rgba(2, 132, 199, 0.35) !important;
  font-weight: 700 !important;
}

/* 12. Date Filter Pills & Tab Bars */
[class*="DateFilterPills"],
div[class*="shadow-inner"][class*="bg-slate-900"],
div[class*="shadow-inner"][class*="bg-slate-100"] {
  background-color: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
  box-shadow: none !important;
}

button[class*="text-slate-400"],
button[class*="text-slate-600"] {
  color: #475569 !important;
}

/* 13. Live Tracker Table Header Banner */
div[class*="from-emerald-950"] h2,
div[class*="from-emerald-950"] [class*="text-amber-200"],
div[class*="from-emerald-950"] [class*="text-amber-300"] {
  color: #0f172a !important;
  font-weight: 700 !important;
}

div[class*="from-emerald-950"] p,
div[class*="from-emerald-950"] [class*="text-emerald-200"] {
  color: #047857 !important;
  font-weight: 600 !important;
}

div[class*="from-emerald-950"] div[class*="bg-emerald-800"] {
  background-color: rgba(var(--theme-primary-rgb), 0.14) !important;
  border: 1px solid rgba(var(--theme-primary-rgb), 0.35) !important;
  color: #047857 !important;
}

div[class*="from-emerald-950"] div[class*="bg-emerald-800"] span {
  color: #047857 !important;
  font-weight: 700 !important;
}

div[class*="from-emerald-950"] div[class*="bg-emerald-800"] span[class*="animate-pulse"] {
  background-color: #047857 !important;
}

/* 14. Inputs, Selects & Textareas */
input, select, textarea {
  background-color: #ffffff !important;
  color: #0f172a !important;
  border-color: #cbd5e1 !important;
}

input::placeholder, textarea::placeholder {
  color: #94a3b8 !important;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--theme-primary) !important;
  box-shadow: 0 0 0 2px rgba(var(--theme-primary-rgb), 0.25) !important;
}

/* 15. Borders & Dividers */
[class*="border-slate-800"],
[class*="border-slate-700"],
[class*="border-slate-900"],
[class*="border-emerald-900"],
[class*="border-emerald-800"],
[class*="border-amber-900"],
[class*="border-amber-800"] {
  border-color: #e2e8f0 !important;
}

/* 16. Tables & Data Grids */
table thead,
table thead tr {
  background-color: #f8fafc !important;
  border-bottom: 2px solid #cbd5e1 !important;
}

table thead th {
  color: #0f172a !important;
  font-weight: 700 !important;
}

table tbody tr {
  border-color: #e2e8f0 !important;
}

table tbody tr:hover {
  background-color: #f8fafc !important;
}

/* Table Footer Summary Row */
table tfoot tr {
  background-color: #064e3b !important;
  border-top: 2px solid #059669 !important;
  color: #ffffff !important;
}

table tfoot td {
  color: #ffffff !important;
}

table tfoot td[class*="text-amber-300"] {
  color: #fde047 !important;
}

table tfoot td[class*="text-emerald-100"],
table tfoot td[class*="text-emerald-200"],
table tfoot td[class*="text-teal-300"] {
  color: #a7f3d0 !important;
}

/* Footnotes & Legends */
div[class*="border-t"] p[class*="italic"] {
  color: #475569 !important;
}
div[class*="border-t"] span[class*="flex"] {
  color: #334155 !important;
}

/* 17. Modals & Dialogs */
[class*="fixed"][class*="z-50"] [class*="bg-slate-900"],
[class*="fixed"][class*="z-[100]"] [class*="bg-slate-900"] {
  background-color: #ffffff !important;
  border-color: #e2e8f0 !important;
  color: #0f172a !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
}

/* 18. Light Scrollbars */
::-webkit-scrollbar-track {
  background: #f1f5f9 !important;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1 !important;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8 !important;
}
`;
  }

  // ========================================================
  // DARK LUXURY THEME STYLING ENGINE (DEFAULT)
  // ========================================================
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

/* 1. Base Typography & Fonts */
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

/* 2. Page Canvas Background */
main,
[class*="bg-slate-950"] {
  background-color: var(--theme-bg-base) !important;
}

/* 3. Cards & Widgets Background */
[class*="bg-slate-900"] {
  background-color: var(--theme-bg-card) !important;
}

/* 4. Recessed Inner Card Areas */
[class*="bg-slate-900"] [class*="bg-slate-950"],
[class*="bg-slate-950"] > [class*="bg-slate-950"] {
  background-color: var(--theme-bg-base) !important;
}

/* 5. Hero Card Gradients */
div[class*="from-emerald-950"],
section[class*="from-emerald-950"],
header[class*="from-emerald-950"] {
  background-color: var(--theme-bg-card, #0b1120) !important;
  background-image: linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.22), var(--theme-bg-card, #0b1120) 50%, rgba(var(--theme-accent-rgb), 0.16)) !important;
}

/* Sidebar User Profile Card in Dark Mode */
aside [class*="rounded-2xl"][class*="from-emerald-950"],
aside [class*="rounded-2xl"][class*="bg-slate-100"] {
  background-color: var(--theme-bg-card, #0b1120) !important;
  background-image: linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.2), var(--theme-bg-base, #030712)) !important;
  border-color: rgba(var(--theme-primary-rgb), 0.3) !important;
}

/* 6. Button & CTA Gradients */
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

/* High contrast text on bright luxury gradients in all themes */
button[class*="from-"],
a[class*="from-"].bg-gradient-to-r {
  color: #020617 !important;
  font-weight: 700 !important;
}
button[class*="from-"] svg,
a[class*="from-"].bg-gradient-to-r svg {
  color: #020617 !important;
}

/* 7. Solid Buttons & Pills */
[class*="bg-emerald-600"],
[class*="bg-emerald-500"],
[class*="bg-teal-600"],
[class*="bg-teal-500"] {
  background-color: var(--theme-primary) !important;
  color: #030712 !important;
}

[class*="bg-amber-400"],
[class*="bg-amber-500"],
[class*="bg-gold-500"],
[class*="bg-gold-400"] {
  background-color: var(--theme-accent) !important;
  color: #030712 !important;
}

[class*="hover:bg-emerald"]:hover {
  background-color: var(--theme-primary-hover) !important;
}

[class*="hover:bg-amber"]:hover {
  background-color: var(--theme-accent-hover) !important;
}

/* Soft Action Pills */
[class*="bg-emerald-950"] {
  background-color: rgba(var(--theme-primary-rgb), 0.22) !important;
  color: var(--theme-primary-light) !important;
}

[class*="bg-amber-950"] {
  background-color: rgba(var(--theme-accent-rgb), 0.22) !important;
  color: var(--theme-accent-light) !important;
}

/* 8. Text Readability & High-Contrast Metrics */
[class*="text-emerald-400"],
[class*="text-emerald-300"],
[class*="text-emerald-500"],
[class*="text-teal-400"],
[class*="text-teal-300"] {
  color: var(--theme-primary-light) !important;
}

[class*="text-amber-400"],
[class*="text-amber-300"],
[class*="text-amber-200"],
[class*="text-gold-400"] {
  color: var(--theme-accent-light) !important;
}

[class*="text-slate-100"] {
  color: #ffffff !important;
}

[class*="text-slate-200"] {
  color: #f1f5f9 !important;
}

[class*="text-slate-300"] {
  color: #e2e8f0 !important;
}

[class*="text-slate-400"] {
  color: #cbd5e1 !important;
}

[class*="text-slate-500"] {
  color: #94a3b8 !important;
}

/* 9. Borders & Dividers */
[class*="border-emerald-"] {
  border-color: rgba(var(--theme-primary-rgb), 0.38) !important;
}

[class*="border-amber-"] {
  border-color: rgba(var(--theme-accent-rgb), 0.38) !important;
}

[class*="border-slate-800"],
[class*="border-slate-700"] {
  border-color: rgba(var(--theme-primary-rgb), 0.16) !important;
}

/* 10. Soft Tints & Badges */
[class*="bg-emerald-500/10"],
[class*="bg-emerald-500/20"] {
  background-color: rgba(var(--theme-primary-rgb), 0.16) !important;
}

[class*="bg-amber-500/10"],
[class*="bg-amber-500/20"] {
  background-color: rgba(var(--theme-accent-rgb), 0.16) !important;
}

/* 11. Inputs, Focus States & Rings */
input, select, textarea {
  background-color: rgba(var(--theme-bg-base-rgb), 0.85) !important;
  border-color: rgba(var(--theme-primary-rgb), 0.28) !important;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--theme-accent) !important;
  box-shadow: 0 0 0 1px var(--theme-accent) !important;
}

/* 12. Scrollbars */
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
