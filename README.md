# 🍽️ Shopify Catering Service — Enterprise Executive Portal & Architecture

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Cluster-47a248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Admin-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Audio%20%26%20Video-orange?style=for-the-badge&logo=webrtc)](https://webrtc.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Production%20Ready-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

A luxury, ultra-fast, and production-grade **Enterprise Catering Management, Financial Ledger & Real-Time Communication Platform** built for executive teams. Designed to deliver sub-millisecond perceived latency, robust role-based access control (RBAC), live database storage telemetry, interactive Point of Sale (POS), real-time WebRTC voice/video calls, and client-side bulk invoice image generation.

---

## 📑 Table of Contents

1. [Executive Overview & Capabilities](#-executive-overview--capabilities)
2. [System Architecture Diagram](#-system-architecture-diagram)
3. [Deep-Dive Architectural Components](#-deep-dive-architectural-components)
   - [Presentation & Client SWR Caching Layer](#1-presentation--client-swr-caching-layer)
   - [Authentication, RBAC & User Synchronization Engine](#2-authentication-rbac--user-synchronization-engine)
   - [Financial Ledger & Dynamic Balance Rebalancing](#3-financial-ledger--dynamic-balance-rebalancing)
   - [Real-Time WebRTC Voice & Video Calling Engine](#4-real-time-webrtc-voice--video-calling-engine)
   - [Storage & Quota Telemetry Monitoring Engine](#5-storage--quota-telemetry-monitoring-engine)
   - [Bulk High-Resolution Invoice Generation (PNG & ZIP)](#6-bulk-high-resolution-invoice-generation-png--zip)
4. [Data Models & MongoDB Schemas](#-data-models--mongodb-schemas)
5. [Complete API Reference Directory](#-complete-api-reference-directory)
6. [Application Page Routes Directory](#-application-page-routes-directory)
7. [Environment Variables Specification](#-environment-variables-specification)
8. [Local Development & Production Deployment](#-local-development--production-deployment)
9. [Performance Optimization Guidelines](#-performance-optimization-guidelines)
10. [License & Enterprise Support](#-license--enterprise-support)

---

## 🌟 Executive Overview & Capabilities

* **⚡ Ultra-Fast 0ms Client Cache (SWR):** Client-side optimistic memory cache (`clientCache.ts`) ensures instant page transitions without waiting for network requests.
* **👑 Dynamic Role-Based Access Control (RBAC):** Hierarchical permissions across `super_admin`, `admin`, `staff`, and `user`. Super Admin privileges are cryptographically anchored and immune to privilege revocation.
* **💾 Live Cloud Telemetry & Quota Gauges:** Continuous, real-time monitoring of MongoDB Atlas storage size (`dataSize`, `storageSize`, `indexSize`) and Firebase Storage/Auth usage with automated progress gauges.
* **💰 Zero-Drift Financial Accounting:** Advance wallet balances, consumption expenditure, and receivables (outstanding dues) automatically reconcile on order creation, updates, or deletions.
* **📞 Full-Mesh WebRTC Audio/Video Calls & Chat:** Real-time 1-on-1 voice and video calling with audible ringtones, call status modals, dynamic user presence heartbeats, and private/group team messaging.
* **🧾 1-Click High-Resolution Invoices (PNG & ZIP):** Native HTML5 Canvas generator produces branded, luxury receipts with golden border accents. Users can download individual receipts or batch export an entire tab as a compressed `.zip` archive.
* **📱 1920px Full-Width Luxury Dark UI:** Built with Tailwind CSS, Emerald-Gold accents, custom typography, and responsive support from mobile devices to ultra-wide desktop monitors.
* **🌐 Dual Language Architecture:** Instant client-side localization toggle between Bengali (বাংলা) and English (EN).

---

## 🏛️ System Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer ["Client Presentation Layer (Browser / Mobile)"]
        UI["Next.js 15 React 19 Client Components"]
        Cache["0ms Memory SWR Client Cache"]
        Canvas["HTML5 Canvas Receipt & ZIP Engine"]
        RTCClient["WebRTC PeerConnection Client (Audio/Video/Data)"]
    end

    subgraph EdgeLayer ["Next.js App Router & Edge Server"]
        Middleware["Auth & RBAC Route Guards"]
        APIRoutes["Serverless API Route Handlers (/api/*)"]
        Signaling["WebRTC Call Signaling & Heartbeat State"]
        CacheHeaders["HTTP CDN & Cache-Control Headers"]
    end

    subgraph DataLayer ["Cloud Persistence & External Services"]
        Mongo[("MongoDB Atlas (Cluster0)<br/>- Users & Balances<br/>- Orders & Invoices<br/>- Menu Dishes<br/>- Chat Messages")]
        FirebaseAuth["Firebase Authentication<br/>(Google Sign-In & Password Auth)"]
        FirebaseAdmin["Firebase Admin SDK<br/>(Custom Claims & Token Verification)"]
        STUNTURN["Google STUN Servers<br/>(P2P NAT Traversal)"]
    end

    UI <--> Cache
    UI <--> Canvas
    UI <--> RTCClient

    UI <== "HTTPS / JSON API" ==> APIRoutes
    UI <== "Dynamic Token Auth" ==> FirebaseAuth
    RTCClient <== "STUN Binding" ==> STUNTURN
    RTCClient <== "Signaling (Offer/Answer/ICE)" ==> Signaling

    APIRoutes --> Middleware
    APIRoutes <== "Mongoose / Mongo Driver Connection Pool" ==> Mongo
    APIRoutes <== "Admin SDK Verify & User Sync" ==> FirebaseAdmin
```

---

## 🔍 Deep-Dive Architectural Components

### 1. Presentation & Client SWR Caching Layer

To guarantee sub-second interaction, the frontend implements a Stale-While-Revalidate (SWR) client-side caching pattern in `src/lib/clientCache.ts`:

```
User Action / Navigation
       │
       ▼
Check Client Cache ─────────► [HIT]  Render Instant 0ms Cached View
       │                                     ▲
       ▼ [MISS / Refresh]                     │
Fetch Background Server API                   │
       │                                     │
       ▼                                     │
Receive Fresh Server Payload ────────────────┴── Update Cache & Re-render
```

* **Immediate Hydration:** Pages initialize their state synchronously from `getClientCache(key)`, eliminating empty loading spinners on back/forward navigation.
* **Silent Background Invalidation:** `clearClientCache(key)` is triggered during mutate operations (e.g., adding an order clears `orders_list` and `members_list`), triggering a background refresh without jarring layout shifts.
* **Link Prefetching:** Critical sidebar navigation links use Next.js `prefetch={true}` to preload JS chunks prior to click.

---

### 2. Authentication, RBAC & User Synchronization Engine

The platform features a multi-layered security architecture combining Firebase Auth with persistent MongoDB User Profiles:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Member
    participant FB as Firebase Authentication
    participant App as Next.js API (/api/users/sync)
    participant DB as MongoDB Atlas Users Collection

    User->>FB: Google Sign-In or Email / Password Login
    FB-->>User: ID Token & User Profile (UID, Email, Name, Avatar)
    User->>App: POST /api/users/sync with Profile & Token
    App->>DB: Query User by Email or UID
    alt User Exists (Active)
        App->>DB: Update lastLogin & Sync Profile Info
    alt User Was Previously Deleted (Revive Allowed)
        App->>DB: Restore User Record (role: user, balance: 0)
    else New Registration
        App->>DB: Insert New UserRecord (Default Balance: 0, Auto Super Admin if Email Matches)
    end
    DB-->>App: Confirmed User Record
    App-->>User: Authenticated Session with Dynamic Role
```

#### Role Hierarchy:
* **`super_admin`:** Unrestricted administrative oversight. Can manage staff roles, adjust balances, purge accounts, inspect storage telemetry, and execute system maintenance.
* **`admin`:** Kitchen operations and ledger management. Can modify menu dishes, manage live catering orders, process POS payments, and oversee team members.
* **`staff`:** Order tracking and meal status transitions (Cooking, Delivered, Paid).
* **`user`:** Customer access. Can review personal balances, place orders, download high-resolution invoices, and participate in team chat and calls.

> [!IMPORTANT]
> The primary system Super Admin email (`mdrifayethossen@gmail.com`) is cryptographically protected against role demotion, balance tampering, and account deletion across all API routes.

---

### 3. Financial Ledger & Dynamic Balance Rebalancing

The accounting core operates under a zero-drift reconciliation model. Balance changes are transactional and audited:

```
[Order Creation / Edit / Delete]
             │
             ├──► Calculate: totalBill = sum(item.quantity * item.unitPrice)
             │
             ├──► Payment Method: "Wallet"
             │        │
             │        ├── Order Created ──► Deduct bill from user.balance
             │        │
             │        └── Order Deleted ──► Refund bill to user.balance
             │
             └──► Auto-Recompute Member Metrics:
                      ├── totalSpent  = sum of all paid orders
                      └── currentDue  = sum of all pending/due orders
```

* **Advance Wallet Deposits:** Super Admins and Admins can credit, debit, or set user balances with instant database persistence.
* **Change-to-Wallet Routing:** Counter POS register allows routing excess cash change directly into the member's wallet account.
* **Receivables & Dues Detection:** Unpaid or partially paid meals automatically mark the order as `Due` or `Partial`, updating the member's `currentDue` balance.

---

### 4. Real-Time WebRTC Voice & Video Calling Engine

1-on-1 voice and video calls operate peer-to-peer using modern WebRTC standards facilitated by an internal serverless signaling hub:

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Caller (Alice)
    participant Signal as Next.js Signaling Hub (/api/chat/call)
    actor Bob as Callee (Bob)

    Alice->>Signal: POST action: "initiate" (Caller Info & Call Type)
    Signal->>Bob: Poll / Push Incoming Call Event
    Bob-->>Alice: Audible Ringing State Triggered
    Bob->>Signal: POST action: "accept"
    Alice->>Alice: Create RTCPeerConnection & Local Media Stream
    Alice->>Signal: Send SDP Offer
    Signal->>Bob: Deliver SDP Offer
    Bob->>Bob: Create RTCPeerConnection & Add Media Tracks
    Bob->>Signal: Send SDP Answer
    Signal->>Alice: Deliver SDP Answer
    Alice<-->Bob: Exchange ICE Candidates via Google STUN
    Note over Alice,Bob: Direct Encrypted P2P Media Stream Established
    Alice->>Signal: POST action: "end"
    Signal-->>Bob: Terminate Call Session & Release Media Hardware
```

* **STUN/ICE Traversal:** Uses Google's global STUN servers (`stun.l.google.com:19302`) for symmetric NAT and firewall traversal.
* **Presence Heartbeat:** Periodic background ping (`/api/users/presence`) records online status, active devices, and last-seen timestamps.
* **Hardware Controls:** In-call controls for microphone mute, camera toggle, and dynamic call duration timer.

---

### 5. Storage & Quota Telemetry Monitoring Engine

Built to provide complete infrastructure transparency, the Super Admin portal features live telemetry cards powered by `/api/admin/metrics/storage`:

```
┌────────────────────────────────────────────────────────┐
│  📊 Live Infrastructure Storage Telemetry             │
├────────────────────────────────┬───────────────────────┤
│  MongoDB Atlas (M0 Free Tier)  │  Firebase Cloud Store │
│  Storage: 42.1 MB / 512.0 MB   │  Stored: 18.4 MB / 1G │
│  Index Size: 1.2 MB            │  Active Users: 1      │
│  [=========>         ] 8.2%    │  [=====>         ]1.8%│
├────────────────────────────────┴───────────────────────┤
│  ⚡ Dynamic Refresh (30s) • Live Connection: Connected │
└────────────────────────────────────────────────────────┘
```

* **MongoDB Stats:** Directly executes `db.stats()` on the active database to report `dataSize`, `storageSize`, `indexSize`, `objects` count, and collection counts.
* **Quota Warnings:** Progress bars dynamically transition from Emerald (`< 70%`) to Amber (`70% - 89%`) and Rose (`>= 90%`).
* **Auto-Polling:** Background polling every 30 seconds with an instant manual refresh trigger.

---

### 6. Bulk High-Resolution Invoice Generation (PNG & ZIP)

The platform provides client-side invoice rendering and bulk export through `src/lib/receiptGenerator.ts`:

1. **Native HTML5 Canvas Rendering:**
   * High-DPI canvas (800px width with dynamic height based on line items).
   * Luxury dark gradient background (`#090d16` to `#0f172a`), emerald and gold border accents (`#059669` / `#fbbf24`), and typography matching executive print standards.
   * Customer details, itemized breakdown, bill totals, and digital verification seal.
2. **1-Click Batch Export (ZIP):**
   * Powered by `jszip`, users and admins can click **"Download All Invoices (X)"** to generate individual PNG files for every filtered order in the current view and download them as a unified ZIP archive (`Shopify_Catering_Invoices_[tab].zip`).

---

## 🗄️ Data Models & MongoDB Schemas

### 1. `UserRecord` (Collection: `users`)
```typescript
interface UserRecord {
  id: string;                  // Unique User ID (Firebase UID or Mongo ObjectId)
  name: string;                // Full Name
  username?: string;           // Custom @username handle
  email: string;               // Normalized email address
  role: 'super_admin' | 'admin' | 'staff' | 'user';
  balance: number;             // Pre-paid wallet balance in BDT (৳)
  currentDue: number;          // Total outstanding unpaid orders in BDT (৳)
  totalSpent: number;          // Total lifetime consumption spent in BDT (৳)
  department: string;          // e.g. Development, Marketing, Engineering
  avatar: string;              // Profile image URL (or UI-Avatars fallback)
  phone?: string;              // Contact phone number
  lastSeen?: string;           // ISO timestamp of last presence ping
  isOnline?: boolean;          // Realtime presence state
  blockedUsers?: string[];     // Array of blocked user IDs for chat
  createdAt: string;           // ISO registration timestamp
}
```

### 2. `OrderData` (Collection: `orders`)
```typescript
interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderData {
  _id?: string;                // MongoDB ObjectId
  orderNumber: string;         // Branded Order ID (e.g. ORD-20261119-001)
  customerName: string;
  customerEmail?: string;
  customerDepartment?: string;
  customerAvatar?: string;
  userId?: string;             // Linked UserRecord ID
  itemsText: string;           // Human-readable summary
  items?: OrderItem[];         // Itemized dishes breakdown
  totalBill: number;           // Total bill amount in BDT (৳)
  paidAmount: number;          // Amount tendered by customer
  changeDue: number;           // Change to return (or routed to wallet)
  status: 'Paid' | 'Pending' | 'Due' | 'Partial' | 'Cooking' | 'Delivered' | 'Cancelled';
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Card' | 'Credit' | 'Wallet';
  depositChangeToWallet?: boolean;
  notes?: string;              // Dietary or preparation instructions
  orderDate: string;           // ISO order timestamp
}
```

### 3. `MenuItemData` (Collection: `menu`)
```typescript
interface MenuItemData {
  _id?: string;
  name: string;                // English dish title
  nameBn: string;              // Bengali dish title
  category: 'Refreshments' | 'Lunch' | 'Breakfast' | 'Beverages' | 'Dessert' | 'Executive Catering';
  price: number;               // Unit price in BDT (৳)
  description: string;         // English description
  descriptionBn: string;       // Bengali description
  imageUrl: string;            // Dish photo URL
  isAvailable: boolean;        // In Stock / Out of Stock toggle
  popular: boolean;            // Highlight badge toggle
  calories?: number;           // Nutritional calories count
}
```

### 4. `ChatMessage` & `ChatGroup` (Collections: `chat_messages`, `chat_groups`)
```typescript
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;         // For 1-on-1 direct messages
  groupId?: string;            // For team channel messages
  text: string;
  createdAt: string;
}
```

---

## 📡 Complete API Reference Directory

| Endpoint | Method | Access Level | Description |
| :--- | :---: | :---: | :--- |
| `/api/admin/metrics/storage` | `GET` | Super Admin | Returns live MongoDB `dbStats`, collection sizes, and Firebase storage telemetry. |
| `/api/admin/permissions` | `GET, POST` | Super Admin | Reads or updates user access roles and permissions. |
| `/api/auth/reset-password` | `POST` | Public | Generates or verifies emergency 6-digit password reset codes. |
| `/api/chat/call` | `POST` | Authenticated | WebRTC signaling hub: initiates, answers, exchanges ICE candidates, and ends calls. |
| `/api/chat/groups` | `GET, POST` | Authenticated | Lists team chat channels or creates a new group. |
| `/api/chat/groups/[id]` | `GET, PUT, DELETE`| Group Admins | Manages channel metadata and member lists. |
| `/api/chat/messages` | `GET, POST` | Authenticated | Retrieves conversation threads and posts messages. |
| `/api/menu` | `GET, POST, PUT, DELETE` | Admin / Super Admin | Full CRUD operations on menu dishes and availability toggles. |
| `/api/orders` | `GET, POST` | Authenticated | Queries catering orders with date filters or creates a new order. |
| `/api/orders/[id]` | `GET, PUT, DELETE`| Admin / Super Admin | Modifies an existing order or permanently deletes it, auto-recalculating member spent. |
| `/api/pos` | `POST` | Staff / Admin | Fast-path POS order creation with automatic cash tender and wallet balance calculations. |
| `/api/settings/orders` | `GET, POST` | Admin | Configuration options for ordering hours and kitchen states. |
| `/api/stats` | `GET` | Admin / Super Admin | Financial statistics, revenue breakdown, and collection percentages. |
| `/api/users` | `GET, POST` | Admin / Super Admin | Fetches member directory or adjusts wallet balance (`add`, `deduct`, `set`). |
| `/api/users/[id]` | `GET, PUT, DELETE`| Super Admin | Updates profile details or purges an account from the database. |
| `/api/users/block` | `POST` | Authenticated | Blocks or unblocks a peer from messaging and calling. |
| `/api/users/presence` | `GET, POST` | Authenticated | Heartbeat ping to register online status and retrieve team presence. |
| `/api/users/profile` | `GET, PUT` | Authenticated | Retrieves or updates the logged-in user's profile and avatar. |
| `/api/users/sync` | `POST` | Authenticated | Syncs Firebase authentication with MongoDB and revives returning accounts. |

---

## 🧭 Application Page Routes Directory

```
src/app/
├── (auth)/
│   └── login/                 # Modern luxury authentication portal (Email & Google Sign-In)
├── admin/                     # Kitchen Operations & Order Workflow Hub
├── super-admin/               # Executive Super Admin Control Center & Quota Monitor
├── user/                      # Personal Member Catering Hub & Receipt Downloads
├── menu/                      # Digital Menu Catalog & Admin Dish Management
├── orders/                    # Master Orders Ledger & 1-Click ZIP Receipt Export
├── pos/                       # Express Counter POS Register
├── members/                   # Team Member Directory & Balance Ledger
├── tracker/                   # Google Sheets-style Live Order & Cash Reconciliation Sheet
├── chat/                      # Real-time Team Messaging & WebRTC Audio/Video Calls
├── layout.tsx                 # Root Layout with SWR Providers, AuthGuard & Toast System
└── globals.css                # Custom scrollbars, number spinner fixes & responsive rules
```

---

## ⚙️ Environment Variables Specification

Create a `.env.local` file in the root directory:

```env
# ==============================================================================
# Database Configuration (MongoDB Atlas)
# ==============================================================================
# Connection string pointing to your MongoDB Atlas cluster (Replica Set supported)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopify_catering?retryWrites=true&w=majority

# ==============================================================================
# Firebase Client SDK Configuration (Next.js Public)
# ==============================================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ==============================================================================
# Firebase Admin SDK Configuration (Server-Side Only)
# ==============================================================================
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
# Format private key with escaped newlines (\n) if placed in a single string
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# ==============================================================================
# Application Settings
# ==============================================================================
NEXT_PUBLIC_APP_NAME="Shopify Catering Service"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

---

## 🚀 Local Development & Production Deployment

### Prerequisites
* **Node.js:** v18.18.0 or higher (v20+ recommended)
* **npm:** v9.0.0 or higher
* **MongoDB:** Atlas Free Tier Cluster or local MongoDB instance
* **Firebase Project:** Authentication (Google & Email/Password enabled)

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/rifat3790/Shopify-Catering-Service.git
cd Shopify-Catering-Service

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# (Populate .env.local with your MongoDB Atlas and Firebase credentials)

# 4. Start local development server
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Production Verification & Build
To verify type safety and ensure all 29 routes compile cleanly:
```bash
npm run build
npm start
```

### Vercel 1-Click Deployment
1. Push your changes to GitHub.
2. Link the repository to your [Vercel Dashboard](https://vercel.com).
3. In **Settings -> Environment Variables**, add the keys defined in `.env.local`.
4. Deploy! Next.js 15 App Router and API Route Handlers will deploy automatically as optimized Edge and Serverless functions.

---

## ⚡ Performance Optimization Guidelines

* **Database Indexing:** Compound indexes on MongoDB collections (`createdAt: -1`, `orderDate: -1`, `customerEmail: 1`, `userId: 1`) guarantee sub-10ms query execution across thousands of historical orders.
* **HTTP Cache Headers:** API routes emit `Cache-Control: public, s-maxage=5, stale-while-revalidate=30` allowing Vercel's Edge Network to serve cached responses instantly.
* **Input Sanitation & No-Spinners:** Form inputs are stripped of native browser number steppers to prevent overlap, backed by step-button increments (`- / +`).
* **Zero Dummy State:** Empty states display clean onboarding guidance rather than static dummy seed records, ensuring that every record reflects live database state.

---

## 🛡️ License & Enterprise Support

* **Project:** Shopify Catering Service — Enterprise Executive Portal
* **Lead Architect:** Md Refayet Hossen ([@rifat3790](https://github.com/rifat3790))
* **License:** Proprietary / Enterprise Internal Use

---
*Crafted with luxury engineering, absolute type-safety, and production-grade resilience.*
