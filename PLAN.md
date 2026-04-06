# PLAN.md — CCPS Pro Web Migration

> **Architect Persona** | Created: 2026-04-04  
> Constraint: This document MUST be updated before any code is written.

---

## 1. Executive Summary

Migrate the `cartel-website` Next.js dashboard into a clean `ccps-pro-web` project.  
The new UI is built around **5 primary tabs** and must talk exclusively to the existing `ccps-pro` backend (Python mapper + Node webhook-handler) via its existing API surface — no old Python-backend logic is carried over.

---

## 2. Cartel-Website Audit

### 2.1 File-by-File Compatibility Matrix

Below, every file in `cartel-website` is graded:

| Status | Meaning |
|--------|---------|
| ✅ MIGRATE | Directly compatible — extract and adapt |
| 🔄 ADAPT | Needs moderate refactoring to fit new schema/tab structure |
| ⚠️ RETHINK | Concept is valid but implementation must change significantly |
| ❌ DROP | Not compatible or not needed |

---

#### Layout & Shell

| File | Status | Notes |
|------|--------|-------|
| `app/layout.js` | 🔄 ADAPT | Keep provider nesting (SolanaProvider → AuthProvider → UIProvider). Drop `TransactionProvider`, `AccessControl`, `NotificationListener` for now. Replace Pokemon fonts with Inter/Mono for the "professional" vibe per Architect. |
| `components/Navbar.js` | 🔄 ADAPT | Health-check indicator is good — wire to real `/api/health`. Logo + wallet button layout reusable. Remove Pokemon font title treatment. |
| `components/Sidebar.js` | 🔄 ADAPT | Navigation items must change to the new 5-tab structure. The glassmorphism + mobile overlay pattern is solid — keep. |

#### Core Pages

| File | Status | New Tab | Notes |
|------|--------|---------|-------|
| `app/page.js` (Home/Deals) | ⚠️ RETHINK | **Tab 2: Active Deals** | Currently this IS the homepage showing filtered deals from `GET /api/get-listings` (Redis B opps). In the new structure, this becomes Tab 2, not the home page. The filter toolbar (category segmented control, sort dropdown, recheck button) is **fully compatible** with Redis B schema. The `fetchListings` call to `GET /api/get-listings` works as-is. |
| `app/admin/page.js` | 🔄 ADAPT | **Tab 3: All Listings** | The paginated data-table fetching from `GET /api/get-all-deals` is what we need for the "all listings from Helius" tab. Server-side pagination, sort, filter — all compatible. The slide-out inspection panel is great, keep it. Rename from "Admin" → "Listings Feed" or "Pipeline". |
| `app/watchlist/page.js` | ⚠️ RETHINK | **Tab 4: Watchlist** | Current implementation uses Zustand persisted to `localStorage` — purely client-side. For the TradingView-style watchlist with price history, we need: (1) backend persistence of watched cards, (2) ALT price history fetching + storage (in daily mapper cron → Redis A), (3) a price-history chart component. The existing `WatchlistButton` toggle UX is good, but the store needs backend sync. |
| `app/inspect/page.js` | 🔄 ADAPT | **Tab 5: Card Search** | Search by mint/grading ID via `GET /api/inspect-card`. Fully compatible — already proxies to backend which checks Redis A + live ME fallback. Add "Add to Watchlist" prominently + show price history if available. |
| `app/holdings/page.js` | ❌ DROP | — | Wallet holdings viewer — not in the 5-tab spec. Can be added later as a sub-feature. |
| `app/settings/page.js` | ❌ DROP (for now) | — | Settings page is fully functional but not in the core 5-tab spec. Will be accessible via a settings icon in navbar after core tabs are done. |
| `app/live/priceService.js` | ✅ MIGRATE | Global util | CoinGecko SOL→USD cache. Universally needed. Extract to `lib/priceService.ts`. |

#### Components (in `app/components/`)

| File | Status | Notes |
|------|--------|-------|
| `Card.js` | 🔄 ADAPT | The primary card display. Fully mapped to Redis B `opp:mint` schema (price_amount, alt_value, cartel_category, img_url, etc.). The snipe button + `handleSnipe` flow is the future buy functionality — keep but **disable for v1**. Remove Pokemon font treatment. |
| `ListingGrid.js` | ✅ MIGRATE | Simple responsive grid wrapper around Card. Fully compatible. |
| `HoldingsCard.js` | ❌ DROP | Holdings-specific card. Not needed for v1. |
| `HoldingsGrid.js` | ❌ DROP | Same as above. |
| `WatchlistButton.js` | 🔄 ADAPT | Star toggle button. UX is good, but needs to call backend API instead of local Zustand when we add backend-persisted watchlist. |
| `SolanaProvider.js` | ✅ MIGRATE | Standard wallet adapter setup. Compatible. |
| `WalletButton.js` | ✅ MIGRATE | Standard Phantom/Solflare button. Compatible. |
| `AccessControl.js` | ❌ DROP | Auth gate — adds complexity. Not needed for personal dashboard. |
| `NotificationListener.js` | ❌ DROP | Stub (empty). Not implemented. |
| `Footer.js` | ❌ DROP | Empty footer. |
| `Header.js` | ❌ DROP | Unused legacy component. |
| `Sidebar.js` (in app/components/) | ❌ DROP | Duplicate of the root `components/Sidebar.js` with different content. |

#### Utilities & Stores

| File | Status | Notes |
|------|--------|-------|
| `app/utils/format.js` | ✅ MIGRATE | `getConfidenceColor` and `getDifferenceColor` — universally used. |
| `store/watchlistStore.js` | ⚠️ RETHINK | Local-only Zustand store. Need to add backend sync layer for price history. Keep as optimistic-UI cache with server sync. |
| `store/authStore.js` | ❌ DROP | Unused (auth is in context). |
| `context/AuthContext.js` | 🔄 ADAPT | Wallet-based auth. The `login_with_wallet`, `authFetch`, token management are all compatible with ccps-pro backend `/api/auth/login`. Simplify: remove router redirect logic. |
| `context/UIContext.js` | ✅ MIGRATE | Simple sidebar toggle state. |
| `app/context/TransactionContext.js` | ❌ DROP | Priority fee context for buy flow — defer to v2. |
| `app/hooks/useNotifications.js` | ❌ DROP | Push notification hook — not in v1 scope. |

#### Configuration

| File | Status | Notes |
|------|--------|-------|
| `tailwind.config.js` | 🔄 ADAPT | Color palette (primary-bg `#0c0a15`, accent-gold `#FFD700`, status colors) is excellent. Drop pixel/pokemon font families. Add Inter + IBM Plex Mono. |
| `app/styles/globals.css` | 🔄 ADAPT | The glassmorphism (`.glass`), card-glow, micro-animations (fadeInUp, shimmer, pulse-glow), custom scrollbar, hexagon pattern background — all excellent, keep. Drop Pokemon font-face declarations. |
| `next.config.js` | 🔄 ADAPT | Image remote patterns (arweave, placehold, pinata, magiceden CDN) all needed. Drop PWA wrapper for now. |
| `postcss.config.js` | ✅ MIGRATE | Standard postcss + tailwind. |
| `lib/config.js` | ❌ DROP | Dead code — references old Azure Functions URL. |
| `app/api/[[...slug]]/route.js` | ✅ MIGRATE | **Critical**. API proxy to ccps-pro backend. This is how the frontend talks to the Python/Node backend. Fully compatible. |

---

### 2.2 Backend API Compatibility Check

The `ccps-pro` backend exposes these endpoints (proxied via the catch-all route):

| Endpoint | Source | Used By | Status |
|----------|--------|---------|--------|
| `GET /api/get-listings` | Redis B (opps) | Tab 2: Active Deals | ✅ Works |
| `GET /api/get-all-deals` | Redis B (paginated) | Tab 3: All Listings | ✅ Works |
| `GET /api/inspect-card?query=` | Redis A + ME fallback | Tab 5: Card Search | ✅ Works |
| `POST /api/trigger/recheck` | Rechecker | Tab 2: Recheck button | ✅ Works |
| `POST /api/trigger/full-recheck` | Rechecker | Settings (future) | ✅ Works |
| `POST /api/auth/login` | Auth | Navbar sign-in | ✅ Works |
| `GET /api/user/status/:wallet` | Auth | Session validation | ✅ Works |
| `GET /api/settings/:wallet` | Settings | Settings page (future) | ✅ Works |
| `POST /api/settings/:wallet` | Settings | Settings page (future) | ✅ Works |
| `GET /api/get-wallet-holdings` | ME API | Holdings (dropped) | ❌ Not needed v1 |
| `POST /api/buy/create-tx` | ME buy flow | Buy feature (v2) | ⏳ Deferred |

#### New Endpoints Needed

| Endpoint | Purpose | Backend Change |
|----------|---------|----------------|
| `GET /api/analytics/dashboard` | Tab 1: Home analytics | **NEW** — aggregate from Redis A + B (total cards tracked, active deals count, deals by tier, avg discount, scan velocity) |
| `GET /api/watchlist/:wallet` | Tab 4: Get user's watchlist | **NEW** — store in Redis A under `watchlist:<wallet>` |
| `POST /api/watchlist/:wallet/add` | Tab 4: Add card to watchlist | **NEW** |
| `DELETE /api/watchlist/:wallet/:mint` | Tab 4: Remove from watchlist | **NEW** |
| `GET /api/price-history/:mint` | Tab 4: Alt price history for card | **NEW** — save during daily mapper cron |

---

### 2.3 Data Sources Map

```
┌─────────────┐                    ┌──────────────────────────────────┐
│  Redis A    │                    │  ccps-pro-web (New Dashboard)    │
│  (Watchlist) │                    │                                  │
│             │◀── Tab 5 search ───│  Tab 1: Home (analytics)         │
│  30k cards  │    /inspect-card   │  Tab 2: Active Deals (Redis B)   │
│  alt_value  │                    │  Tab 3: All Listings (Redis B)   │
│  insured    │◀── Tab 1 agg ─────│  Tab 4: Watchlist (Redis A new)  │
│  grade      │    /analytics      │  Tab 5: Card Search (Redis A)    │
│  supply     │                    │                                  │
│  NEW: price │◀── Tab 4 history ─│  Future: One-Click Buy           │
│  NEW: watch │    /price-history  │  Future: Settings                │
└─────────────┘    /watchlist      └──────────────────────────────────┘
       ▲                                        │
       │ nightly                                │ proxy
       │ mapper cron                            ▼
┌──────┴──────┐                    ┌──────────────────┐
│  Mapper     │                    │  API Proxy       │
│  (Python)   │                    │  /api/[[...slug]]│
└─────────────┘                    └────────┬─────────┘
                                            │
┌─────────────┐                             │
│  Redis B    │◀─── Tab 2, Tab 3 ───────────┘
│  (Opps)     │     /get-listings
│             │     /get-all-deals
│  opp:mint   │
│  deals      │
└─────────────┘
```

---

## 3. Proposed Next.js Folder Structure

```
ccps-pro-web/
├── app/
│   ├── layout.tsx                  # Root layout (providers, sidebar, navbar)
│   ├── page.tsx                    # Tab 1: HOME — Analytics Dashboard
│   │
│   ├── deals/
│   │   └── page.tsx                # Tab 2: Active Deals (from old page.js)
│   │
│   ├── listings/
│   │   └── page.tsx                # Tab 3: All Listings Pipeline (from old admin/page.js)
│   │
│   ├── watchlist/
│   │   └── page.tsx                # Tab 4: Watchlist (TradingView-style)
│   │
│   ├── search/
│   │   └── page.tsx                # Tab 5: Card Search (from old inspect/page.js)
│   │
│   ├── api/
│   │   └── [[...slug]]/
│   │       └── route.ts            # API proxy to ccps-pro backend
│   │
│   ├── globals.css                 # Global styles (from old globals.css, cleaned)
│   └── favicon.ico
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              # Top bar: logo, health status, wallet
│   │   └── Sidebar.tsx             # Left nav: 5 tabs + settings icon
│   │
│   ├── cards/
│   │   ├── DealCard.tsx            # Card component for deals (from old Card.js)
│   │   ├── DealCardGrid.tsx        # Grid layout for cards (from old ListingGrid.js)
│   │   └── CardDetailPanel.tsx     # Slide-out detail panel (from old admin inspection)
│   │
│   ├── analytics/
│   │   ├── StatCard.tsx            # Single KPI stat card
│   │   ├── TierDistribution.tsx    # Tier breakdown chart
│   │   ├── ScanVelocity.tsx        # Recent scans timeline
│   │   └── DashboardGrid.tsx       # Analytics grid layout
│   │
│   ├── watchlist/
│   │   ├── WatchlistTable.tsx      # TradingView-style watchlist table
│   │   ├── PriceHistoryChart.tsx   # Price history sparkline/chart
│   │   └── WatchlistButton.tsx     # Star toggle (migrated)
│   │
│   ├── search/
│   │   ├── SearchBar.tsx           # Search input with glow effect
│   │   └── CardInspector.tsx       # Full card detail view (from old inspect)
│   │
│   ├── filters/
│   │   ├── CategoryFilter.tsx      # Category segmented control
│   │   ├── SortDropdown.tsx        # Sort selector
│   │   └── AdvancedFilters.tsx     # Slide-out filter panel (from old AdvancedFilters)
│   │
│   └── ui/
│       ├── WalletButton.tsx        # Solana wallet connect button
│       ├── SolanaProvider.tsx      # Wallet adapter provider
│       └── LoadingStates.tsx       # Skeleton, spinner, empty states
│
├── lib/
│   ├── priceService.ts             # SOL→USD price cache (from old priceService.js)
│   ├── format.ts                   # Color utilities (from old format.js)
│   └── api.ts                      # Typed API client helpers
│
├── stores/
│   └── watchlistStore.ts           # Zustand watchlist (with backend sync)
│
├── context/
│   ├── AuthContext.tsx             # Wallet auth provider (from old AuthContext)
│   └── UIContext.tsx               # Sidebar state (from old UIContext)
│
├── types/
│   └── index.ts                   # TypeScript interfaces (Card, Deal, WatchlistItem, etc.)
│
├── public/
│   ├── logo.png                   # CCPS logo
│   └── manifest.json              # PWA manifest (later)
│
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── postcss.config.js
├── package.json
└── .env.local
```

---

## 4. Tab Specifications

### Tab 1: HOME — Analytics Dashboard
**Route**: `/` (root)  
**Data Sources**: New `GET /api/analytics/dashboard` (aggregates from Redis A + B)

| Widget | Data | Source |
|--------|------|--------|
| Total Cards Tracked | Count of keys in Redis A | Redis A |
| Active Deals Now | Count of `opp:*` keys in Redis B | Redis B |
| Deals by Tier | Gold / Silver / Bronze / Iron breakdown | Redis B |
| Average Discount | Mean `diff%` across active opps | Redis B |
| Scan Velocity | Listings received per hour (last 24h) | Redis B timestamps |
| Top Deals | Top 5 by discount % | Redis B |
| Recent Activity | Last 10 webhook events | Redis B (sorted by `listed_at`) |

**Components to build**: `StatCard`, `TierDistribution`, `ScanVelocity`, `DashboardGrid`  
**Existing compatible components**: None — this is net new.

---

### Tab 2: Active Deals
**Route**: `/deals`  
**Data Source**: `GET /api/get-listings` (Redis B)

**Migrated from**: `app/page.js` (main page)  
**What carries over**:
- Search + debounce logic ✅
- Category segmented control (Gold/Red/Blue/All) ✅
- Sort dropdown (newest, price, best deals, popularity) ✅
- Cartel Recheck dropdown ✅
- `ListingGrid` → `DealCardGrid` ✅
- `Card` → `DealCard` ✅
- SOL price conversion ✅

**What changes**: Route moves from `/` to `/deals`. Component names cleaned up.

---

### Tab 3: All Listings (Pipeline View)
**Route**: `/listings`  
**Data Source**: `GET /api/get-all-deals` (Redis B, paginated)

**Migrated from**: `app/admin/page.js`  
**What carries over**:
- Server-side paginated data table ✅
- Column sorting (alt_value, price, listed_at) ✅
- Filter dropdowns (company, category, status) ✅
- Search by name ✅
- Row click → slide-out inspection panel ✅
- Pagination controls ✅

**What changes**: Rename "Deal Management" → "Listings Pipeline". Remove admin-only framing. This shows ALL pings from Helius — even before tier classification — so users can see what the webhook picked up.

---

### Tab 4: Watchlist (TradingView-Style)
**Route**: `/watchlist`  
**Data Source**: New `GET /api/watchlist/:wallet` + `GET /api/price-history/:mint`

**Migrated from**: `app/watchlist/page.js` (concept only)  
**What carries over**:
- WatchlistButton star toggle (UX) ✅
- Zustand store structure (as client-side cache) ✅

**What must be NEW**:
- **Backend-persisted watchlist**: `watchlist:<wallet>` in Redis A
- **Price history storage**: During daily mapper cron, for each watched card, save `alt_value` snapshots as a time-series (simple JSON array in Redis A: `price_history:<mint>`)
- **TradingView-style table**: Columns = Name, Current Price (SOL), Alt Value ($), Change (24h), Sparkline, Actions
- **PriceHistoryChart**: Inline sparkline per row + expandable full chart
- **Add from anywhere**: WatchlistButton on DealCard, CardInspector, ListingGrid rows

**Backend changes needed for mapper cron**:
```python
# In mapper.py daily run, for each card in watchlist:
# 1. Fetch current alt_value
# 2. Append to price_history:<mint> list in Redis A
# 3. Keep last 90 days of daily snapshots
```

---

### Tab 5: Card Search
**Route**: `/search`  
**Data Source**: `GET /api/inspect-card?query=` (Redis A + ME fallback)

**Migrated from**: `app/inspect/page.js`  
**What carries over**:
- Search bar with glow effect ✅
- Search by mint address or grading ID ✅
- Full card detail display (image, metrics grid, deep-dive table, external links) ✅
- Loading + not-found states ✅

**What changes**: 
- Add prominent "Add to Watchlist" button
- If card is in watchlist, show price history chart inline
- Route: `/inspect` → `/search`

---

## 5. Future: One-Click Buy (v2)

**Current state in cartel-website**: `Card.js` has a fully implemented `handleSnipe` flow:
1. Calls `POST /api/buy/create-tx` with buyer wallet, mint, price, priorityFee
2. Deserializes transaction (supports both legacy and versioned)
3. Signs with wallet adapter
4. Sends raw transaction to Solana

**ccps-pro backend**: `watcher/sniper.ts` has the auto-buy flow using ME API + Jito bundles.

**Feasibility assessment**: With the auto-buy already functional in the backend and the transaction signing flow already built in the frontend, this is **now feasible** as a v2 feature. The `DealCard` will keep the SNIPE button but disabled with a "Coming Soon" badge until wired.

---

## 6. Migration Order (Recommended)

| Phase | What | Depends On |
|-------|------|------------|
| **Phase 0** | Initialize Next.js project, install deps, setup Tailwind | Nothing |
| **Phase 1** | Shell: Layout, Navbar, Sidebar, Providers, API proxy | Phase 0 |
| **Phase 2** | Tab 2: Active Deals (easiest — most code is copy-paste) | Phase 1 |
| **Phase 3** | Tab 3: All Listings Pipeline (second easiest — admin page adapted) | Phase 1 |
| **Phase 4** | Tab 5: Card Search (inspect page adapted) | Phase 1 |
| **Phase 5** | Tab 1: Home Analytics Dashboard (new — needs backend endpoint) | Phase 1 + backend work |
| **Phase 6** | Tab 4: Watchlist (most complex — needs backend endpoints + mapper changes) | Phase 1 + backend work |
| **Phase 7** | Settings page (if needed) | Phase 1 |
| **Phase 8** | One-Click Buy (v2) | Phase 2 + backend sniper ready |

---

## 7. Tech Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 (App Router) | Same as cartel-website, no learning curve |
| Language | TypeScript | Stronger typing for complex data models |
| Styling | Tailwind CSS v3 | Same as cartel-website, migrate config directly |
| State | Zustand | Already used, lightweight, works with SSR |
| Wallet | @solana/wallet-adapter-react | Already integrated and working |
| Icons | lucide-react | Already used throughout |
| Toasts | sonner | Already used, excellent DX |
| Charts | Lightweight Charts (TradingView lib) | For watchlist price history — real TradingView look |
| Fonts | Inter (headings) + IBM Plex Mono (data) | Professional, not gaming/pixel aesthetic |

---

## 8. Design Vibe

Per the Architect and Frontend Builder personas:

- **Dark mode only** (bg: `#0c0a15`)
- **TradingView-inspired**: Dense data, clean tables, sparkline charts
- **Gold accent** (`#FFD700`) for primary actions
- **Glassmorphism** for panels (already in globals.css)
- **Professional & minimal** — no Pokemon fonts, no gaming aesthetics
- **Micro-animations** — keep fadeInUp, shimmer, card-hover-lift from globals.css
- **Real-time feel** — health indicator pulsing, skeleton loading states

---

## Appendix: Files to Copy vs Build

### Direct Copy (with cleanup)
- `app/api/[[...slug]]/route.js` → `.ts`
- `app/utils/format.js` → `lib/format.ts`
- `app/live/priceService.js` → `lib/priceService.ts`
- `app/components/SolanaProvider.js` → `components/ui/SolanaProvider.tsx`
- `app/components/WalletButton.js` → `components/ui/WalletButton.tsx`
- `app/components/ListingGrid.js` → `components/cards/DealCardGrid.tsx`
- `context/UIContext.js` → `context/UIContext.tsx`
- `postcss.config.js` → as-is
- `app/styles/globals.css` → `app/globals.css` (cleaned)

### Heavy Adaptation
- `app/page.js` → `app/deals/page.tsx`
- `app/admin/page.js` → `app/listings/page.tsx`
- `app/inspect/page.js` → `app/search/page.tsx`
- `app/components/Card.js` → `components/cards/DealCard.tsx`
- `components/Navbar.js` → `components/layout/Navbar.tsx`
- `components/Sidebar.js` → `components/layout/Sidebar.tsx`
- `context/AuthContext.js` → `context/AuthContext.tsx`
- `store/watchlistStore.js` → `stores/watchlistStore.ts`
- `tailwind.config.js` → `tailwind.config.ts`
- `next.config.js` → `next.config.ts`

### Build From Scratch
- `app/page.tsx` (Home analytics dashboard)
- `app/watchlist/page.tsx` (TradingView-style watchlist)
- `components/analytics/*` (all analytics widgets)
- `components/watchlist/*` (watchlist table, price chart)
- `lib/api.ts` (typed API client)
- `types/index.ts` (TypeScript interfaces)
- Backend: `/api/analytics/dashboard`
- Backend: `/api/watchlist/*`
- Backend: `/api/price-history/*`
- Mapper: price history snapshot logic
