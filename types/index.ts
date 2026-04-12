// ============================================================
//  CCPS Pro Web — Core TypeScript Interfaces
//  Based on: ccps-pro/watcher/webhook-handler.ts (Redis B schema)
//            ccps-pro/mapper/mapper.py (Redis A schema)
//            ccps-pro/watcher/embeds.ts (Tier enum)
// ============================================================

/** Tier classifications from embeds.ts calculateTier() */
export enum Tier {
  AUTOBUY = 'AUTOBUY',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
  IRON = 'IRON',
  SUSPICIOUS = 'SUSPICIOUS',
  NONE = 'NONE',
}

/**
 * Redis A Card — Stored by mapper.py nightly cron
 * Key format: `<mint_address>` → JSON
 * Source: mapper.py line 290 `final_obj`
 */
export interface RedisACard {
  token_mint: string;
  name: string;
  grading_id: string;
  grading_company: string;       // PSA | CGC | BGS | BECKETT
  grade: string;                 // e.g. "GEM MINT 10"
  grade_num: number;             // e.g. 10
  category: string;              // "Pokemon"
  insured_value: number;
  supply: number;
  img_url: string | null;
  set_url: string | null;
  alt_asset_id: string | null;  // Normalized key
  alt_value: number | null;
  market_price: number;
  price_source: string;          // ALT | FALLBACK_INSURED | NONE
  max_buy_price: number;
  alt_confidence: number | null;
  alt_lower_bound: number | null;
  alt_upper_bound: number | null;
  recent_sales: Array<{ date: string; price: number }>;
  cartel_avg: number;
  cartel_avg_history: Array<{ date: string; price: number }>;
  is_orphan?: boolean;
  timestamp: string;             // CDT ISO timestamp
}

/**
 * Redis B Opportunity — Stored by webhook-handler.ts handleHit()
 * Key format: `opp:<mint_address>` → JSON
 * Source: webhook-handler.ts line 250 `opportunityData`
 *
 * This is a superset of RedisACard with listing-specific fields appended.
 */
export interface Deal extends RedisACard {
  listing_price_usd: number;
  listing_price_sol: number;
  listing_signature: string;
  listing_timestamp: number;     // Date.now() epoch ms
  tier: Tier;
  seller: string;
  isCompetitor?: boolean;
  isCartel?: boolean;
  manual_bid_value?: number | null;
  source?: string;
}

export interface Holding {
  token_mint: string;
  name: string;
  img_url: string | null;
  grade: string;
  grading_company: string;
  buy_price_sol: number;
  buy_price_usd: number;
  buy_timestamp: number;
  buy_signature: string;
  listed_price_sol?: number;
  listed_price_usd?: number;
  listed_timestamp?: number;
  listed_signature?: string;
  status: 'held' | 'listed' | 'sold';
  profit_sol?: number;
  profit_usd?: number;
}

/**
 * Legacy cartel_category mapping used in old cartel-website
 * The old `page.js` filter uses: AUTOBUY | GOOD | OK | SKIP
 * The new backend uses Tier enum. Map as needed.
 */
export type CartelCategory = 'AUTOBUY' | 'GOOD' | 'OK' | 'SKIP';

/** Search API response from /api/search?q= */
export interface SearchResponse {
  query: string;
  count: number;
  results: RedisACard[];
}

/** Deals API response from /api/deals */
export interface DealsResponse {
  count: number;
  showing: number;
  deals: Deal[];
}

/** Analytics dashboard data (new endpoint /api/analytics/dashboard) */
export interface AnalyticsDashboard {
  totalCardsTracked: number;     // Redis A dbSize (mint keys only)
  activeDealsCount: number;      // Redis B opp:* key count
  dealsByTier: Record<Tier, number>;
  averageDiscount: number;       // Mean discount % across active opps
  totalProfit: number;           // Sum of estimated profit across opps
  scanVelocity: number[];        // Listings per hour for last 24 hours (24 values)
  topDeals: Deal[];              // Top 5 by discount
  recentActivity: EventLogEntry[];
}

/** Event log entry from /api/events */
export interface EventLogEntry {
  ts: string;
  type: string;                  // HIT | DEAL | SKIP | DEDUP | SKIP_NONE
  mint?: string;
  name?: string;
  tier?: string;
  price?: number;
  discount?: number;
  profit?: number;
  detail?: string;
}

/** Watchlist item (future — backend-persisted) */
export interface WatchlistItem extends RedisACard {
  added_at: string;
  price_history?: Array<{ date: string; alt_value: number }>;
}

/** Redis info from /api/redis-info */
export interface RedisInfo {
  redisA?: {
    dbSize: number;
    seenKeys: number;
  };
  redisB?: {
    dbSize: number;
    oppKeys: number;
  };
}
