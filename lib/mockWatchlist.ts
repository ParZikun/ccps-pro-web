import { type WatchlistItem, type RedisACard } from '@/types'

// Mock watchlist data - simulates what would be stored in Redis A under watchlist:<wallet>
const watchlistCards: RedisACard[] = [
  {
    token_mint: 'WL_MOCK_MINT_001_charizard_vmax',
    name: 'Charizard VMAX #1000',
    grading_id: '10000000',
    grading_company: 'PSA',
    grade: 'GEM MINT 10',
    grade_num: 10,
    category: 'Pokemon',
    insured_value: 320,
    supply: 147,
    img_url: 'https://placehold.co/400x560/13111a/FFD700?text=Charizard',
    set_url: null,
    alt_asset_id: 'alt-wl-1',
    alt_value: 450,
    market_price: 450,
    price_source: 'ALT',
    max_buy_price: 360,
    alt_confidence: 88,
    alt_lower_bound: 380,
    alt_upper_bound: 520,
    recent_sales: [
      { date: '2026-04-03', price: 440 },
      { date: '2026-04-01', price: 465 },
      { date: '2026-03-28', price: 420 },
      { date: '2026-03-25', price: 410 },
    ],
    cartel_avg: 433.75,
    timestamp: new Date().toISOString(),
  },
  {
    token_mint: 'WL_MOCK_MINT_002_umbreon_vmax',
    name: 'Umbreon VMAX Alt Art #2055',
    grading_id: '10000035',
    grading_company: 'PSA',
    grade: 'GEM MINT 10',
    grade_num: 10,
    category: 'Pokemon',
    insured_value: 580,
    supply: 42,
    img_url: 'https://placehold.co/400x560/13111a/FFD700?text=Umbreon',
    set_url: null,
    alt_asset_id: 'alt-wl-2',
    alt_value: 820,
    market_price: 820,
    price_source: 'ALT',
    max_buy_price: 656,
    alt_confidence: 92,
    alt_lower_bound: 720,
    alt_upper_bound: 920,
    recent_sales: [
      { date: '2026-04-04', price: 810 },
      { date: '2026-04-02', price: 795 },
      { date: '2026-03-30', price: 830 },
      { date: '2026-03-27', price: 780 },
    ],
    cartel_avg: 803.75,
    timestamp: new Date().toISOString(),
  },
  {
    token_mint: 'WL_MOCK_MINT_003_lugia_v_alt',
    name: 'Lugia V Alt Art #3012',
    grading_id: '10000021',
    grading_company: 'CGC',
    grade: 'GEM MINT 10',
    grade_num: 10,
    category: 'Pokemon',
    insured_value: 210,
    supply: 83,
    img_url: 'https://placehold.co/400x560/13111a/FFD700?text=Lugia',
    set_url: null,
    alt_asset_id: 'alt-wl-3',
    alt_value: 310,
    market_price: 310,
    price_source: 'ALT',
    max_buy_price: 248,
    alt_confidence: 76,
    alt_lower_bound: 260,
    alt_upper_bound: 360,
    recent_sales: [
      { date: '2026-04-04', price: 305 },
      { date: '2026-04-01', price: 290 },
      { date: '2026-03-29', price: 315 },
      { date: '2026-03-26', price: 280 },
    ],
    cartel_avg: 297.50,
    timestamp: new Date().toISOString(),
  },
  {
    token_mint: 'WL_MOCK_MINT_004_rayquaza_vmax',
    name: 'Rayquaza VMAX #4107',
    grading_id: '10000042',
    grading_company: 'BGS',
    grade: 'MINT 9',
    grade_num: 9,
    category: 'Pokemon',
    insured_value: 120,
    supply: 230,
    img_url: 'https://placehold.co/400x560/13111a/FFD700?text=Rayquaza',
    set_url: null,
    alt_asset_id: 'alt-wl-4',
    alt_value: 175,
    market_price: 175,
    price_source: 'ALT',
    max_buy_price: 140,
    alt_confidence: 65,
    alt_lower_bound: 140,
    alt_upper_bound: 210,
    recent_sales: [
      { date: '2026-04-03', price: 170 },
      { date: '2026-04-01', price: 180 },
      { date: '2026-03-28', price: 165 },
      { date: '2026-03-25', price: 185 },
    ],
    cartel_avg: 175.00,
    timestamp: new Date().toISOString(),
  },
  {
    token_mint: 'WL_MOCK_MINT_005_espeon_vmax',
    name: 'Espeon VMAX Alt Art #5233',
    grading_id: '10000063',
    grading_company: 'PSA',
    grade: 'GEM MINT 10',
    grade_num: 10,
    category: 'Pokemon',
    insured_value: 380,
    supply: 55,
    img_url: 'https://placehold.co/400x560/13111a/FFD700?text=Espeon',
    set_url: null,
    alt_asset_id: 'alt-wl-5',
    alt_value: 540,
    market_price: 540,
    price_source: 'ALT',
    max_buy_price: 432,
    alt_confidence: 85,
    alt_lower_bound: 460,
    alt_upper_bound: 620,
    recent_sales: [
      { date: '2026-04-04', price: 530 },
      { date: '2026-04-02', price: 550 },
      { date: '2026-03-30', price: 525 },
      { date: '2026-03-27', price: 515 },
    ],
    cartel_avg: 530.00,
    timestamp: new Date().toISOString(),
  },
]

// Mock price history (daily snapshots for last 30 days)
function generatePriceHistory(baseValue: number, volatility: number = 0.05): Array<{ date: string; alt_value: number }> {
  const history: Array<{ date: string; alt_value: number }> = []
  let value = baseValue * 0.9

  for (let i = 30; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    const change = (Math.random() - 0.45) * baseValue * volatility
    value = Math.max(value * 0.7, value + change)
    history.push({ date, alt_value: Math.round(value * 100) / 100 })
  }

  return history
}

export const mockWatchlistItems: WatchlistItem[] = watchlistCards.map(card => ({
  ...card,
  added_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
  price_history: generatePriceHistory(card.alt_value || 100),
}))

export function getMockWatchlist(): WatchlistItem[] {
  return mockWatchlistItems
}
