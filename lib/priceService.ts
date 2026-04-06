'use client'

/**
 * SOL→USD price cache using CoinGecko API.
 * Migrated from cartel-website/app/live/priceService.js → TypeScript
 */

let cachedSolPrice = 0
let lastFetchTime = 0
const CACHE_DURATION_SECONDS = 300 // 5 minutes

async function fetchSolToUsdcPrice(): Promise<number | null> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    return data.solana.usd
  } catch (error) {
    console.error('Could not fetch SOL price from CoinGecko:', error)
    return null
  }
}

export async function getSolPriceUsd(): Promise<number> {
  const currentTime = Date.now() / 1000

  if (cachedSolPrice === 0 || (currentTime - lastFetchTime) > CACHE_DURATION_SECONDS) {
    const newPrice = await fetchSolToUsdcPrice()
    if (newPrice !== null) {
      cachedSolPrice = newPrice
      lastFetchTime = currentTime
    }
  }

  return cachedSolPrice
}
