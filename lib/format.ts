/**
 * Color utilities for confidence scores and price differences.
 * Migrated from cartel-website/app/utils/format.js → TypeScript
 */

interface ColorScheme {
  text: string
  border: string
  bg: string
}

/** Confidence score coloring (ALT valuation confidence %) */
export function getConfidenceColor(confidence: number | null | undefined): ColorScheme {
  const conf = Number(confidence) || 0
  if (conf > 70) return { text: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/10' }
  if (conf >= 40) return { text: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/10' }
  return { text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' }
}

/** Difference/discount coloring (listing vs alt value) */
export function getDifferenceColor(diff: number | null | undefined): ColorScheme {
  const difference = Number(diff) || 0
  if (difference > 30) return { text: 'text-accent-gold', border: 'border-accent-gold/20', bg: 'bg-accent-gold/10' }
  if (difference > 20) return { text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' }
  if (difference > 10) return { text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' }
  return { text: 'text-gray-400', border: 'border-white/10', bg: 'bg-white/5' }
}

/** Tier badge coloring */
export function getTierColor(tier: string): ColorScheme {
  switch (tier) {
    case 'GOLD':
    case 'AUTOBUY':
      return { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' }
    case 'SILVER':
      return { text: 'text-gray-300', border: 'border-gray-400/30', bg: 'bg-gray-400/10' }
    case 'BRONZE':
      return { text: 'text-amber-600', border: 'border-amber-600/30', bg: 'bg-amber-600/10' }
    case 'IRON':
      return { text: 'text-gray-400', border: 'border-gray-500/30', bg: 'bg-gray-500/10' }
    case 'SUSPICIOUS':
      return { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' }
    case 'NONE':
    case 'INFO':
      return { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' }
    default:
      return { text: 'text-gray-500', border: 'border-white/10', bg: 'bg-white/5' }
  }
}

/** Format time ago string */
export function timeAgo(dateInput: string | number | null | undefined): string {
  if (!dateInput) return 'N/A'
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 31536000)}y ago`
}

/** Format USD value */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Format SOL value */
export function formatSol(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(2)} SOL`
}

/** Truncate address or string */
export function truncate(str: string, startLen = 6, endLen = 4): string {
  if (!str || str.length <= startLen + endLen + 3) return str
  return `${str.slice(0, startLen)}...${str.slice(-endLen)}`
}
