// ============================================================
//  CCPS Pro Web — Central Mock Data Engine
//
//  Generates realistic mock API responses strictly based on:
//    - mapper.py final_obj schema → Redis A (RedisACard)
//    - webhook-handler.ts opportunityData → Redis B (Deal)
//    - embeds.ts Tier enum + calculateTier() logic
//
//  Usage:
//    import { mockDeals, mockSearchResults, mockAnalytics } from '@/lib/mockData'
//
//  All mock data uses real-world Pokemon card names, realistic
//  ALT valuations, and proper tier classifications per the
//  actual calculateTier() logic from embeds.ts.
// ============================================================

import { type Deal, type RedisACard, type AnalyticsDashboard, type EventLogEntry, Tier } from '@/types'

// ─────────────────────────────────────────────────
//  HELPER: Realistic card names
// ─────────────────────────────────────────────────

const CARD_NAMES = [
  'Charizard VMAX',
  'Pikachu V',
  'Mewtwo GX',
  'Lugia V Alt Art',
  'Umbreon VMAX Alt Art',
  'Rayquaza VMAX',
  'Blastoise EX',
  'Mew VMAX',
  'Gengar VMAX',
  'Eevee VMAX',
  'Espeon VMAX Alt Art',
  'Dragonite V Alt Art',
  'Gyarados EX',
  'Snorlax VMAX',
  'Articuno V Alt Art',
  'Zapdos V Alt Art',
  'Moltres V Alt Art',
  'Celebi V Alt Art',
  'Sylveon VMAX Alt Art',
  'Glaceon VMAX Alt Art',
]

const GRADING_COMPANIES = ['PSA', 'CGC', 'BGS'] as const
const GRADES = ['GEM MINT 10', 'MINT 9', 'NM-MT 8', 'NM 7'] as const
const GRADE_NUMS = [10, 9, 8, 7] as const

// Realistic Arweave image URLs (placeholder pattern)
const IMG_BASE = 'https://arweave.net'
// We use placehold.co for mock images since we don't have real arweave hashes
const mockImgUrl = (index: number) =>
  `https://placehold.co/400x560/13111a/FFD700?text=${encodeURIComponent(CARD_NAMES[index % CARD_NAMES.length].split(' ')[0])}`

// Deterministic hash-like mint addresses
const mockMint = (index: number) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  let result = ''
  const seed = index * 7919 + 31 // Prime-based seeding for variety
  for (let i = 0; i < 44; i++) {
    result += chars[(seed * (i + 1) * 37) % chars.length]
  }
  return result
}

const mockSignature = (index: number) => {
  const chars = '0123456789abcdef'
  let result = ''
  const seed = index * 6271
  for (let i = 0; i < 88; i++) {
    result += chars[(seed * (i + 1) * 13) % chars.length]
  }
  return result
}

const mockSeller = (index: number) => mockMint(index + 1000)

// ─────────────────────────────────────────────────
//  Redis A Cards (from mapper.py)
// ─────────────────────────────────────────────────

function generateRedisACard(index: number): RedisACard {
  const companyIdx = index % GRADING_COMPANIES.length
  const gradeIdx = index % GRADE_NUMS.length
  const altValue = 50 + Math.round((index * 73 % 500) + Math.sin(index) * 100)
  const confidence = 40 + (index * 11 % 55) // 40-95
  const supply = 10 + (index * 137 % 5000)
  const insuredValue = altValue * 0.7 + (index % 30)
  const cartelAvg = altValue * (0.85 + (index % 20) / 100)

  const recentSales = Array.from({ length: Math.min(4, 1 + (index % 4)) }, (_, i) => ({
    date: new Date(Date.now() - (i + 1) * 86400000 * (1 + index % 7)).toISOString().split('T')[0],
    price: altValue * (0.8 + Math.random() * 0.4),
  }))

  return {
    token_mint: mockMint(index),
    name: `${CARD_NAMES[index % CARD_NAMES.length]} #${1000 + index}`,
    grading_id: `${10000000 + index * 7}`,
    grading_company: GRADING_COMPANIES[companyIdx],
    grade: GRADES[gradeIdx],
    grade_num: GRADE_NUMS[gradeIdx],
    category: 'Pokemon',
    insured_value: Math.round(insuredValue * 100) / 100,
    supply,
    img_url: mockImgUrl(index),
    set_url: null,
    alt_assest_id: `alt-asset-${index}`,
    alt_value: altValue,
    market_price: altValue,
    price_source: 'ALT',
    max_buy_price: Math.round(altValue * 0.8 * 100) / 100,
    alt_confidence: confidence,
    alt_lower_bound: Math.round(altValue * 0.75),
    alt_upper_bound: Math.round(altValue * 1.25),
    recent_sales: recentSales,
    cartel_avg: Math.round(cartelAvg * 100) / 100,
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
  }
}

// ─────────────────────────────────────────────────
//  TIER CALCULATION (mirrors embeds.ts exactly)
// ─────────────────────────────────────────────────

function calculateMockTier(listingPrice: number, altValue: number, confidence: number, insuredValue: number): Tier {
  const discount = altValue > 0 ? (altValue - listingPrice) / altValue : 0
  const discountPct = discount * 100
  const profit = (0.85 * altValue) - listingPrice

  if (discountPct > 85 || insuredValue <= 5) return Tier.SUSPICIOUS
  if (discountPct >= 30 && confidence >= 75 && profit > 15) return Tier.GOLD
  if ((discountPct >= 30 && confidence < 75) || (discountPct >= 15 && profit > 25)) return Tier.SILVER
  if (discountPct >= 20 && profit >= 10) return Tier.BRONZE
  if (discountPct >= 15 && profit >= 10) return Tier.IRON
  return Tier.NONE
}

// ─────────────────────────────────────────────────
//  Redis B Deals (from webhook-handler.ts handleHit)
// ─────────────────────────────────────────────────

function generateDeal(index: number): Deal {
  const card = generateRedisACard(index)

  // Generate a listing price that creates interesting tier distribution
  // Some cards get huge discounts (Gold), some moderate (Silver/Bronze), some small (Iron/None)
  const discountMultipliers = [0.55, 0.60, 0.65, 0.70, 0.72, 0.75, 0.78, 0.80, 0.82, 0.85, 0.88, 0.90, 0.95]
  const multiplier = discountMultipliers[index % discountMultipliers.length]
  const listingPriceUsd = Math.round(card.alt_value! * multiplier * 100) / 100
  const solPrice = 135.50 // Mock SOL price
  const listingPriceSol = Math.round((listingPriceUsd / solPrice) * 10000) / 10000

  const tier = calculateMockTier(
    listingPriceUsd,
    card.alt_value!,
    card.alt_confidence!,
    card.insured_value
  )

  return {
    ...card,
    listing_price_usd: listingPriceUsd,
    listing_price_sol: listingPriceSol,
    listing_signature: mockSignature(index),
    listing_timestamp: Date.now() - index * 1800000, // Stagger by 30 min each
    tier,
    seller: mockSeller(index),
  }
}

// ─────────────────────────────────────────────────
//  EXPORTED MOCK DATA
// ─────────────────────────────────────────────────

/** 20 mock deals for /api/deals (Redis B) */
export const mockDeals: Deal[] = Array.from({ length: 20 }, (_, i) => generateDeal(i))

/** 30 mock cards for /api/search (Redis A) */
export const mockSearchResults: RedisACard[] = Array.from({ length: 30 }, (_, i) => generateRedisACard(i + 100))

/** Mock analytics dashboard response */
export const mockAnalytics: AnalyticsDashboard = (() => {
  const tierCounts: Record<Tier, number> = {
    [Tier.AUTOBUY]: 0,
    [Tier.GOLD]: 0,
    [Tier.SILVER]: 0,
    [Tier.BRONZE]: 0,
    [Tier.IRON]: 0,
    [Tier.SUSPICIOUS]: 0,
    [Tier.NONE]: 0,
  }

  let totalDiscount = 0
  let totalProfit = 0
  let validCount = 0

  for (const deal of mockDeals) {
    tierCounts[deal.tier]++
    if (deal.alt_value && deal.alt_value > 0) {
      const discount = ((deal.alt_value - deal.listing_price_usd) / deal.alt_value) * 100
      const profit = (0.85 * deal.alt_value) - deal.listing_price_usd
      totalDiscount += discount
      totalProfit += profit
      validCount++
    }
  }

  // Generate 24h scan velocity (listings per hour)
  const scanVelocity = Array.from({ length: 24 }, (_, i) => {
    // Simulate varying webhook traffic — more during US afternoon hours
    const hour = (new Date().getHours() - 23 + i) % 24
    const base = 3 + Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2) * 4
    return Math.max(0, Math.round(base + Math.random() * 3))
  })

  // Recent activity events
  const recentActivity: EventLogEntry[] = mockDeals.slice(0, 10).map((deal, i) => ({
    ts: new Date(deal.listing_timestamp).toISOString(),
    type: deal.tier === Tier.NONE ? 'SKIP' : 'DEAL',
    mint: deal.token_mint.slice(0, 8) + '...',
    name: deal.name,
    tier: deal.tier,
    price: deal.listing_price_usd,
    discount: deal.alt_value ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value) : 0,
    profit: deal.alt_value ? (0.85 * deal.alt_value - deal.listing_price_usd) : 0,
  }))

  return {
    totalCardsTracked: 28_347,
    activeDealsCount: mockDeals.length,
    dealsByTier: tierCounts,
    averageDiscount: validCount > 0 ? Math.round(totalDiscount / validCount * 10) / 10 : 0,
    totalProfit: Math.round(totalProfit * 100) / 100,
    scanVelocity,
    topDeals: [...mockDeals]
      .filter(d => d.alt_value && d.alt_value > 0)
      .sort((a, b) => {
        const discA = a.alt_value ? (a.alt_value - a.listing_price_usd) / a.alt_value : 0
        const discB = b.alt_value ? (b.alt_value - b.listing_price_usd) / b.alt_value : 0
        return discB - discA
      })
      .slice(0, 5),
    recentActivity,
  }
})()

// ─────────────────────────────────────────────────
//  MOCK API HELPERS (simulate fetch responses)
// ─────────────────────────────────────────────────

/** Simulates GET /api/deals with optional filtering */
export function getMockDeals(options?: {
  tier?: Tier
  search?: string
  limit?: number
  sortBy?: 'listing_timestamp' | 'listing_price_usd' | 'tier'
  order?: 'asc' | 'desc'
}): { count: number; showing: number; deals: Deal[] } {
  let filtered = [...mockDeals]

  if (options?.tier) {
    filtered = filtered.filter(d => d.tier === options.tier)
  }

  if (options?.search) {
    const q = options.search.toLowerCase()
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.grading_id.includes(q) ||
      d.token_mint.includes(q)
    )
  }

  // Sort
  const sortBy = options?.sortBy || 'listing_timestamp'
  const order = options?.order || 'desc'
  filtered.sort((a, b) => {
    const aVal = a[sortBy] ?? 0
    const bVal = b[sortBy] ?? 0
    return order === 'desc'
      ? (bVal as number) - (aVal as number)
      : (aVal as number) - (bVal as number)
  })

  const limit = options?.limit || 50
  const showing = filtered.slice(0, limit)

  return {
    count: filtered.length,
    showing: showing.length,
    deals: showing,
  }
}

/** Simulates GET /api/search?q= against Redis A */
export function getMockSearch(query: string, limit = 20): { query: string; count: number; results: RedisACard[] } {
  if (!query || query.length < 3) {
    return { query, count: 0, results: [] }
  }

  const q = query.toLowerCase()
  const results = mockSearchResults.filter(card =>
    card.name.toLowerCase().includes(q) ||
    card.grading_id.includes(q) ||
    card.token_mint.includes(q)
  ).slice(0, limit)

  return { query, count: results.length, results }
}

/** Simulates GET /api/analytics/dashboard */
export function getMockAnalytics(): AnalyticsDashboard {
  return mockAnalytics
}
