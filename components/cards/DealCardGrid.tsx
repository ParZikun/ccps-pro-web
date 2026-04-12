'use client'

import DealCard from './DealCard'
import type { Deal } from '@/types'
import { useUI } from '@/context/UIContext'
import { LayoutGrid, List as ListIcon } from 'lucide-react'

interface DealCardGridProps {
  deals: Deal[]
  loading?: boolean
  error?: string
  solPriceUSD?: number
}

function SkeletonCard({ mode }: { mode: 'grid' | 'list' }) {
  if (mode === 'list') {
    return (
      <div className="bg-surface rounded-lg border border-white/5 p-3 flex items-center gap-4 animate-pulse">
        <div className="w-10 h-10 skeleton rounded flex-shrink-0" />
        <div className="flex-1 h-4 skeleton rounded w-1/3" />
        <div className="h-4 w-20 skeleton rounded" />
      </div>
    )
  }
  return (
    <div className="bg-surface rounded-lg border border-white/5 overflow-hidden animate-pulse">
      <div className="w-full aspect-[5/4] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
      </div>
    </div>
  )
}

export default function DealCardGrid({ deals, loading, error }: DealCardGridProps) {
  const { viewMode, setViewMode } = useUI()

  if (loading) {
    return (
      <div className={viewMode === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        : "flex flex-col gap-2"
      }>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} mode={viewMode} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-6 text-center" role="alert">
        <p className="text-red-400 font-medium font-mono text-xs uppercase tracking-widest">System Error</p>
        <p className="text-red-400/60 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="rounded-lg bg-surface border border-white/5 p-16 text-center shadow-inner">
        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No active deals detected in pipeline</p>
        <p className="text-gray-600 text-[10px] mt-2 italic">Waiting for market movements...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Grid Toolbar */}
      <div className="flex justify-between items-center bg-surface/20 p-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
        <p className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] font-mono">
          / Pipeline: {deals.length} Objects Detected
        </p>
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 shadow-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-accent-gold text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'text-gray-500 hover:text-white'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-accent-gold text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'text-gray-500 hover:text-white'}`}
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {deals.map((deal, index) => (
            <DealCard key={deal.token_mint} deal={deal} priority={index < 4} />
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-white/5 overflow-hidden">
          <div className="flex flex-col">
            {deals.map((deal) => (
              <DealCard key={deal.token_mint} deal={deal} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
