'use client'

import DealCard from './DealCard'
import type { Deal } from '@/types'

interface DealCardGridProps {
  deals: Deal[]
  loading?: boolean
  error?: string
  solPriceUSD?: number
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-white/5 overflow-hidden animate-pulse">
      <div className="w-full aspect-[5/7] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 skeleton rounded-lg" />
          <div className="h-16 skeleton rounded-lg" />
        </div>
        <div className="h-8 skeleton rounded-lg" />
        <div className="h-8 skeleton rounded-lg" />
      </div>
    </div>
  )
}

export default function DealCardGrid({ deals, loading, error, solPriceUSD }: DealCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-6 text-center" role="alert">
        <p className="text-red-400 font-medium">API Connection Error</p>
        <p className="text-red-400/60 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="rounded-xl bg-surface border border-white/5 p-12 text-center">
        <p className="text-gray-500">No deals found matching your filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {deals.map((deal, index) => (
          <DealCard key={deal.token_mint} deal={deal} solPriceUSD={solPriceUSD} priority={index < 4} />
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500 font-mono">
          Showing {deals.length} results
        </p>
      </div>
    </div>
  )
}
