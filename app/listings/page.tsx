'use client'

import { useState, useMemo, useEffect } from 'react'
import { List, Search, ChevronLeft, ChevronRight, X, ExternalLink, TrendingDown, Clock, Shield, BarChart3, Star, MoreHorizontal, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import { getTierColor, formatUsd, formatSol, timeAgo, getConfidenceColor, truncate } from '@/lib/format'
import type { Deal } from '@/types'
import { Tier } from '@/types'
import Image from 'next/image'

const PAGE_SIZE = 10

const SORT_OPTIONS = [
  { value: 'listing_timestamp-desc', label: 'Newest First' },
  { value: 'listing_timestamp-asc', label: 'Oldest First' },
  { value: 'discount-desc', label: 'Discount ↓' },
  { value: 'discount-asc', label: 'Discount ↑' },
  { value: 'listing_price_usd-asc', label: 'Price: Low to High' },
  { value: 'listing_price_usd-desc', label: 'Price: High to Low' },
  { value: 'alt_value-desc', label: 'Alt Value ↓' },
  { value: 'profit-desc', label: 'Net Profit ↓' },
]

const TIER_OPTIONS = [
  { value: 'ALL', label: 'All Tiers' },
  { value: Tier.GOLD, label: 'Gold' },
  { value: Tier.SILVER, label: 'Silver' },
  { value: Tier.BRONZE, label: 'Bronze' },
  { value: Tier.IRON, label: 'Iron' },
  { value: Tier.SUSPICIOUS, label: 'Suspicious' },
]

const DISCOUNT_OPTIONS = [
  { value: 'ALL', label: 'Any Discount' },
  { value: '30', label: '≥30%' },
  { value: '20', label: '≥20%' },
  { value: '10', label: '≥10%' },
]

const COMPANY_OPTIONS = [
  { value: 'ALL', label: 'All Companies' },
  { value: 'PSA', label: 'PSA' },
  { value: 'CGC', label: 'CGC' },
  { value: 'BGS', label: 'BGS' },
  { value: 'SGC', label: 'SGC' },
]

export default function ListingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const { openDealModal } = useUI()
  const [showFilters, setShowFilters] = useState(false)
  
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [watchingMints, setWatchingMints] = useState<Set<string>>(new Set())

  const [sortBy, setSortBy] = useState('listing_timestamp-desc')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [discountFilter, setDiscountFilter] = useState('ALL')
  const [companyFilter, setCompanyFilter] = useState('ALL')

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      try {
        const urlParams = new URLSearchParams()
        urlParams.append('limit', '200')
        urlParams.append('sortBy', 'listing_timestamp')
        urlParams.append('order', 'desc')
        if (debouncedSearch) urlParams.append('search', debouncedSearch)
        
        const res = await fetch(`/api/deals?${urlParams.toString()}`)
        const data = await res.json()
        setAllDeals(data.deals || [])
        setPage(1)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchListings()
  }, [debouncedSearch])

  const filteredAndSortedDeals = useMemo(() => {
    let result = [...allDeals]

    if (tierFilter !== 'ALL') {
      result = result.filter(d => d.tier === tierFilter)
    }

    if (companyFilter !== 'ALL') {
      result = result.filter(d => d.grading_company === companyFilter)
    }

    if (discountFilter !== 'ALL') {
      const minDiscount = parseFloat(discountFilter)
      result = result.filter(d => {
        if (!d.alt_value || d.alt_value <= 0) return false
        const discount = ((d.alt_value - d.listing_price_usd) / d.alt_value) * 100
        return discount >= minDiscount
      })
    }

    const [sortField, sortDir] = sortBy.split('-')
    result.sort((a, b) => {
      let valA: number, valB: number
      
      switch (sortField) {
        case 'listing_timestamp':
          valA = a.listing_timestamp || 0
          valB = b.listing_timestamp || 0
          break
        case 'discount':
          valA = a.alt_value ? ((a.alt_value - a.listing_price_usd) / a.alt_value) * 100 : 0
          valB = b.alt_value ? ((b.alt_value - b.listing_price_usd) / b.alt_value) * 100 : 0
          break
        case 'listing_price_usd':
          valA = a.listing_price_usd || 0
          valB = b.listing_price_usd || 0
          break
        case 'alt_value':
          valA = a.alt_value || 0
          valB = b.alt_value || 0
          break
        case 'profit':
          valA = a.alt_value ? (0.85 * a.alt_value) - a.listing_price_usd : -999999
          valB = b.alt_value ? (0.85 * b.alt_value) - b.listing_price_usd : -999999
          break
        default:
          valA = a.listing_timestamp || 0
          valB = b.listing_timestamp || 0
      }
      
      return sortDir === 'asc' ? valA - valB : valB - valA
    })

    return result
  }, [allDeals, tierFilter, discountFilter, sortBy])

  const toggleWatchlist = async (mint: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(watchingMints)
    const isCurrentlyWatching = newSet.has(mint)
    
    if (isCurrentlyWatching) newSet.delete(mint)
    else newSet.add(mint)
    setWatchingMints(newSet)

    try {
      if (!isCurrentlyWatching) {
        await fetch(`/api/watchlist/test-wallet-123`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mint })
        })
      } else {
        await fetch(`/api/watchlist/test-wallet-123/${mint}`, { method: 'DELETE' })
      }
    } catch {}
  }

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDeals.length / PAGE_SIZE))
  const paginatedDeals = filteredAndSortedDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFiltersCount = [
    tierFilter !== 'ALL',
    discountFilter !== 'ALL',
    companyFilter !== 'ALL',
    searchQuery.length > 0
  ].filter(Boolean).length
  
  const getPaginationGroup = () => {
    let start = Math.max(page - 2, 1)
    let end = Math.min(start + 4, totalPages)
    
    if (end === totalPages) {
      start = Math.max(end - 4, 1)
    }
    
    const range = []
    for (let i = start; i <= end; i++) range.push(i)
    return range
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <List className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">All Listings</h1>
            <p className="text-sm text-gray-400">
              <span className="text-blue-400 font-mono font-bold">{filteredAndSortedDeals.length}</span> of {allDeals.length} listings
              {activeFiltersCount > 0 && <span className="text-yellow-400 ml-2">({activeFiltersCount} active)</span>}
              <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
                Live Data
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/30 transition-colors w-44"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/30 cursor-pointer hover:bg-white/5"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              showFilters || activeFiltersCount > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-surface border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-surface rounded-xl border border-white/10 p-4 flex flex-wrap gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Tier</label>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setTierFilter(opt.value); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    tierFilter === opt.value ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-black/30 text-gray-400 border border-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Company</label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setCompanyFilter(opt.value); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    companyFilter === opt.value ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-black/30 text-gray-400 border border-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end ml-auto">
            <button
              onClick={() => { setTierFilter('ALL'); setCompanyFilter('ALL'); setDiscountFilter('ALL'); setSearchQuery(''); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3 h-3" /> Clear All Filters
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Card</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Grade</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Price</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Discount</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Tier</th>
                <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold w-12">Watch</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs animate-pulse">Loading Pipeline...</td></tr>
              ) : paginatedDeals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">No listings found.</td></tr>
              ) : (
                paginatedDeals.map((deal) => {
                  const discount = deal.alt_value ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100) : 0
                  const tierColor = getTierColor(deal.tier)
                  return (
                    <tr key={deal.token_mint} className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group" onClick={() => openDealModal(deal)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-black/30"><Image src={deal.img_url || ''} alt="" width={32} height={32} className="w-full h-full object-cover" /></div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate max-w-[180px] group-hover:text-accent-gold">{deal.name}</p>
                            <p className="text-[10px] text-gray-600 font-mono truncate">{truncate(deal.token_mint, 6, 4)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{deal.grading_company} {deal.grade}</td>
                      <td className="px-4 py-3 text-right text-xs font-mono text-white">{formatUsd(deal.listing_price_usd)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold font-mono text-accent-gold">{discount.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tierColor.bg} ${tierColor.text}`}>{deal.tier}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => toggleWatchlist(deal.token_mint, e)} className="p-1.5 rounded-full hover:bg-white/10">
                          <Star className={`w-3.5 h-3.5 ${watchingMints.has(deal.token_mint) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-black/10">
          <p className="text-[10px] text-gray-500 font-mono">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-white/5 text-gray-400 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-white/5 text-gray-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
