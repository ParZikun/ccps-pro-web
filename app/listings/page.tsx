'use client'

import { useState, useMemo, useEffect } from 'react'
import { List, Search, ChevronLeft, ChevronRight, X, ExternalLink, TrendingDown, Clock, Shield, BarChart3, Star, MoreHorizontal } from 'lucide-react'
import { getTierColor, formatUsd, formatSol, timeAgo, getConfidenceColor, truncate } from '@/lib/format'
import type { Deal } from '@/types'
import Image from 'next/image'

const PAGE_SIZE = 10

export default function ListingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [watchingMints, setWatchingMints] = useState<Set<string>>(new Set())

  // Debounce search
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
        setPage(1) // reset to page 1 on new search
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchListings()
  }, [debouncedSearch])

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

  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE))
  const paginatedDeals = allDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  
  // Smart pagination logic
  const getPaginationGroup = () => {
    let start = Math.max(page - 2, 1)
    let end = Math.min(start + 4, totalPages)
    
    // Adjust if we are near the end
    if (end === totalPages) {
      start = Math.max(end - 4, 1)
    }
    
    const range = []
    for (let i = start; i <= end; i++) range.push(i)
    return range
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <List className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">All Listings</h1>
            <p className="text-sm text-gray-400">
              Full pipeline — <span className="text-blue-400 font-mono font-bold">{allDeals.length}</span> webhook events
              <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
                Live Data
              </span>
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by name..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/30 transition-colors w-56"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Card</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Grade</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Listed Price</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Alt Value</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Discount</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Tier</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Time</th>
                <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold w-12">Watch</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs animate-pulse font-mono">
                    [Loading Pipeline Data...]
                  </td>
                </tr>
              ) : paginatedDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">
                    No listings found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedDeals.map((deal) => {
                  const discount = deal.alt_value && deal.alt_value > 0
                    ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100) : 0
                  const tierColor = getTierColor(deal.tier)

                  return (
                    <tr
                      key={deal.token_mint}
                      className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group"
                      onClick={() => setSelectedDeal(deal)}
                    >
                      {/* Card Name + Image */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-black/30 flex-shrink-0">
                            <Image
                              src={deal.img_url || 'https://placehold.co/40x40/13111a/333?text=?'}
                              alt=""
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate max-w-[180px] group-hover:text-accent-gold transition-colors">
                              {deal.name}
                            </p>
                            <p className="text-[10px] text-gray-600 font-mono truncate">
                              {truncate(deal.token_mint, 6, 4)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-300">{deal.grading_company}</p>
                        <p className="text-[10px] text-gray-500">{deal.grade}</p>
                      </td>

                      {/* Listed Price */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-mono text-white">{formatSol(deal.listing_price_sol)}</p>
                        <p className="text-[10px] font-mono text-gray-500">{formatUsd(deal.listing_price_usd)}</p>
                      </td>

                      {/* Alt Value */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-mono text-accent-gold">{formatUsd(deal.alt_value)}</p>
                        <p className={`text-[10px] font-mono ${getConfidenceColor(deal.alt_confidence).text}`}>
                          {deal.alt_confidence?.toFixed(0)}%
                        </p>
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold font-mono ${
                          discount >= 30 ? 'text-yellow-400' :
                          discount >= 20 ? 'text-red-400' :
                          discount >= 10 ? 'text-blue-400' :
                          'text-gray-400'
                        }`}>
                          {discount.toFixed(1)}%
                        </span>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${tierColor.bg} ${tierColor.text} ${tierColor.border} border`}>
                          {deal.tier}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-[10px] text-gray-500 whitespace-nowrap">{timeAgo(deal.listing_timestamp)}</p>
                      </td>

                      {/* Watch Action */}
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={(e) => toggleWatchlist(deal.token_mint, e)}
                          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                          <Star className={`w-3.5 h-3.5 ${watchingMints.has(deal.token_mint) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500 hover:text-white'}`} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-black/10">
          <p className="text-[10px] text-gray-500 font-mono">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allDeals.length)} of {allDeals.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-white/5 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {page > 3 && (
              <>
                <button onClick={() => setPage(1)} className="w-7 h-7 rounded text-xs font-mono text-gray-500 hover:bg-white/5">1</button>
                <MoreHorizontal className="w-3 h-3 text-gray-600 mx-1" />
              </>
            )}

            {getPaginationGroup().map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs font-mono ${
                  page === p
                    ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20'
                    : 'text-gray-500 hover:bg-white/5'
                } transition-colors`}
              >
                {p}
              </button>
            ))}

            {page < totalPages - 2 && (
              <>
                <MoreHorizontal className="w-3 h-3 text-gray-600 mx-1" />
                <button onClick={() => setPage(totalPages)} className="w-7 h-7 rounded text-xs font-mono text-gray-500 hover:bg-white/5">{totalPages}</button>
              </>
            )}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-white/5 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Inspection Panel */}
      {selectedDeal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setSelectedDeal(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-[80] glass border-l border-accent-gold/10 overflow-y-auto animate-slideInRight custom-scrollbar">
            <div className="p-6 space-y-6">
              {/* Close + Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getTierColor(selectedDeal.tier).bg} ${getTierColor(selectedDeal.tier).text} ${getTierColor(selectedDeal.tier).border} border mb-2`}>
                    {selectedDeal.tier}
                  </span>
                  <h2 className="text-lg font-bold text-white">{selectedDeal.name}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedDeal.grading_company} · {selectedDeal.grade}</p>
                </div>
                <button onClick={() => setSelectedDeal(null)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Card Image */}
              <div className="rounded-xl overflow-hidden bg-black/30 border border-white/5">
                <Image
                  src={selectedDeal.img_url || 'https://placehold.co/400x560/13111a/333?text=No+Image'}
                  alt={selectedDeal.name}
                  width={400}
                  height={560}
                  className="w-full object-contain"
                />
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Listed Price</p>
                  <p className="text-lg font-bold text-white font-mono">{formatSol(selectedDeal.listing_price_sol)}</p>
                  <p className="text-xs text-gray-500 font-mono">{formatUsd(selectedDeal.listing_price_usd)}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Alt Value</p>
                  <p className="text-lg font-bold text-accent-gold font-mono">{formatUsd(selectedDeal.alt_value)}</p>
                  <p className={`text-xs font-mono ${getConfidenceColor(selectedDeal.alt_confidence).text}`}>
                    {selectedDeal.alt_confidence?.toFixed(1)}% confidence
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                {[
                  { label: 'Discount', value: selectedDeal.alt_value ? `${((selectedDeal.alt_value - selectedDeal.listing_price_usd) / selectedDeal.alt_value * 100).toFixed(1)}%` : 'N/A', icon: TrendingDown },
                  { label: 'Est. Profit (85%)', value: formatUsd(selectedDeal.alt_value ? (0.85 * selectedDeal.alt_value) - selectedDeal.listing_price_usd : 0), icon: BarChart3 },
                  { label: 'Insured Value', value: formatUsd(selectedDeal.insured_value), icon: Shield },
                  { label: 'Supply', value: selectedDeal.supply.toString(), icon: BarChart3 },
                  { label: 'Cartel Avg', value: formatUsd(selectedDeal.cartel_avg), icon: BarChart3 },
                  { label: 'Listed', value: timeAgo(selectedDeal.listing_timestamp), icon: Clock },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/10 border border-white/[0.03]">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <metric.icon className="w-3.5 h-3.5" />
                      {metric.label}
                    </div>
                    <span className="text-xs font-mono text-white">{metric.value}</span>
                  </div>
                ))}
              </div>

              {/* Recent Sales */}
              {selectedDeal.recent_sales && selectedDeal.recent_sales.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Recent Sales</p>
                  <div className="space-y-1">
                    {selectedDeal.recent_sales.map((sale, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded bg-black/10 border border-white/[0.03] text-xs">
                        <span className="text-gray-500 font-mono">{sale.date}</span>
                        <span className="text-white font-mono">{formatUsd(sale.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mint + Links */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Mint</span>
                  <span className="text-gray-300 font-mono">{truncate(selectedDeal.token_mint, 8, 6)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Seller</span>
                  <span className="text-gray-300 font-mono">{truncate(selectedDeal.seller, 6, 4)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <a href={`https://magiceden.io/item-details/${selectedDeal.token_mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Magic Eden
                  </a>
                  <a href={`https://solscan.io/token/${selectedDeal.token_mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Solscan
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
