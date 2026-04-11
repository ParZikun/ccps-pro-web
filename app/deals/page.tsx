'use client'

import { useState, useMemo } from 'react'
import { Flame, RefreshCw, Search } from 'lucide-react'
import DealCardGrid from '@/components/cards/DealCardGrid'
import CategoryFilter from '@/components/filters/CategoryFilter'
import SortDropdown from '@/components/filters/SortDropdown'
import { Tier, Deal } from '@/types'
import { useEffect } from 'react'
import CardDetailPanel from '@/components/panels/CardDetailPanel'

export default function DealsPage() {
  const [selectedTier, setSelectedTier] = useState<string>('ALL')
  const [sortValue, setSortValue] = useState('listing_timestamp:desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Use debounced search text to avoid spamming the API
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true)
      setError(null)
      try {
        const [sortBy, order] = sortValue.split(':')
        const urlList = new URLSearchParams()
        if (selectedTier !== 'ALL') urlList.append('tier', selectedTier)
        if (debouncedSearch) urlList.append('search', debouncedSearch)
        urlList.append('sortBy', sortBy)
        urlList.append('order', order)

        const res = await fetch(`/api/deals?${urlList.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch deals')
        const data = await res.json()
        setDeals(data.deals || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDeals()
  }, [selectedTier, sortValue, debouncedSearch])

  // Count deals per tier locally for the active list
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: deals.length }
    for (const d of deals) {
      counts[d.tier] = (counts[d.tier] || 0) + 1
    }
    return counts
  }, [deals])

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Deals</h1>
            <p className="text-sm text-gray-400">
              <span className="text-accent-gold font-mono font-bold">{deals.length}</span> opportunities 
              <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-3">
                Live Data
              </span>
            </p>
          </div>
        </div>

      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <CategoryFilter selected={selectedTier} onChange={setSelectedTier} />

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold/30 transition-colors w-44"
            />
          </div>
          <SortDropdown value={sortValue} onChange={setSortValue} />
        </div>
      </div>

      {/* Tier summary */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
        {Object.entries(tierCounts).filter(([k]) => k !== 'ALL' && k !== 'NONE').map(([tier, count]) => (
          <span key={tier} className="px-2 py-0.5 rounded bg-white/5 border border-white/5">
            {tier}: <span className="text-gray-300 font-bold">{count}</span>
          </span>
        ))}
      </div>

      {/* Deal Grid */}
      <DealCardGrid deals={deals} loading={loading} error={error || undefined} onSelectDeal={setSelectedDeal} />
      
      <CardDetailPanel 
        card={selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />
    </div>
  )
}
