# 🍽️ Shopify Catering Service — Enterprise Executive Portal

A luxury, ultra-fast, and production-grade Catering Management & Real-Time Refreshment Order Tracker built with **Next.js 15**, **Tailwind CSS**, **MongoDB Atlas**, and **Firebase Authentication**.

## 🌟 Key Features

- **📊 Google Sheet Style Real-Time Order & Payment Tracker (`/tracker`):**
  - Live calculations of Total Bill, Cash Received, and Refundable Change.
  - Live Collection Rate % dynamically reconciled.
  - Export to CSV and instant luxury printable receipts.
- **👑 Role-Based Dashboards:**
  - **Super Admin (`/super-admin`):** Role assignments (Super Admin, Admin, Staff, User), company wallet balances, and financial control.
  - **Admin Kitchen & Operations (`/admin`):** Kitchen orders workflow, meal status transitions, and menu pricing.
  - **User Catering Hub (`/user`):** Personal meal balances, lifetime food expenditure, and high-resolution receipt image downloads.
- **🍲 Full Menu Management & Admin CRUD (`/menu`):**
  - Add, edit, and delete dishes with photos, pricing, calorie counters, and dual-language Bengali/English descriptions.
  - One-click stock status toggle (In Stock / Out of Stock).
- **👥 Member Directory & Accounts (`/members`):**
  - Dedicated member list showing departments, current wallet balances, and direct ordering.
- **💳 Counter POS Express (`/pos`):**
  - Rapid touch register with cash presets (৳20 - ৳1000) and on-the-fly dynamic custom item creation.
- **🖼️ High-Resolution Order Receipt Image Export:**
  - Instant client-side PNG image rendering with gold frame and digital verification watermark.
- **🌐 Dual-Language Support:**
  - Seamless toggle between Bengali (বাংলা) and English (EN) across all pages.
- **🖥️ 1920px Full-Width Responsive Design:**
  - Optimized for ultra-wide monitors, laptops, tablets, and smartphones.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions & Route Handlers)
- **Styling:** Tailwind CSS (Luxury Emerald & Imperial Gold Palette)
- **Icons:** Pure SVG Vector Icons (Lucide)
- **Database:** MongoDB Atlas (Cluster0) with resilient memory fallback
- **Authentication:** Firebase Auth (Google Sign-In & Email/Password) & Firebase Admin SDK
- **Hosting Ready:** Vercel 1-click deployment

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and run production server
npm run build
npm start
```

## 📦 Vercel Deployment

1. Import this repository `https://github.com/rifat3790/Shopify-Catering-Service` into [Vercel](https://vercel.com).
2. Add your environment variables (`MONGODB_URI`, Firebase keys).
3. Click **Deploy**!

---
© 2026 Shopify Catering Service. Built with luxury standards & production-grade engineering.
