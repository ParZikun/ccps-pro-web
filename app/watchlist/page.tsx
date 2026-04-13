'use client'

import { useState, useMemo } from 'react'
import { Star, TrendingUp, TrendingDown, Trash2, ExternalLink, BarChart3, Search, Plus } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import { formatUsd, getConfidenceColor, timeAgo, truncate } from '@/lib/format'
import type { WatchlistItem } from '@/types'
import { useEffect } from 'react'
import Image from 'next/image'
import Sparkline from '@/components/ui/Sparkline'

export default function WatchlistPage() {
  const { openDealModal, watchingMints, toggleWatchlist } = useUI()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')

  // Sync watchlist data with global watchingMints state
  // If a card is unstarred elsewhere, remove it from the display list
  const activeWatchlist = useMemo(() => {
    return watchlist.filter(item => watchingMints.has(item.token_mint))
  }, [watchlist, watchingMints])

  const filteredList = useMemo(() => {
    if (!searchFilter) return activeWatchlist
    const q = searchFilter.toLowerCase()
    return activeWatchlist.filter((item: WatchlistItem) =>
      item.name.toLowerCase().includes(q) ||
      item.grading_id.includes(q)
    )
  }, [activeWatchlist, searchFilter])

  // We hardcode a test wallet until Solana wallet integration is complete
  const wallet = 'test-wallet-123'

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await fetch(`/api/watchlist/${wallet}`)
        if (res.ok) {
          const data = await res.json()
          setWatchlist(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchWatchlist()
  }, [])

  // Optimized totals based on active (un-deleted) items
  const totalValue = activeWatchlist.reduce((sum, item) => sum + (item.alt_value || 0), 0)
  const avgConfidence = activeWatchlist.length > 0
    ? activeWatchlist.reduce((sum, item) => sum + (item.alt_confidence || 0), 0) / activeWatchlist.length
    : 0

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Star className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Watchlist</h1>
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-mono font-bold">{watchlist.length}</span> cards tracked
              <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
                Live Data
              </span>
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-semibold hover:bg-accent-gold/20 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Card
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-white/5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Portfolio Value</p>
          <p className="text-2xl font-bold text-accent-gold font-mono">{formatUsd(totalValue)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-white/5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cards Watching</p>
          <p className="text-2xl font-bold text-white font-mono">{watchlist.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-white/5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Avg Confidence</p>
          <p className={`text-2xl font-bold font-mono ${getConfidenceColor(avgConfidence).text}`}>{avgConfidence.toFixed(0)}%</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text"
          placeholder="Filter watchlist..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full sm:w-64 bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/30 transition-colors"
        />
      </div>

      {/* Watchlist Table */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Card</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Alt Value</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Confidence</th>
                <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">30d Trend</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Max Buy</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Added</th>
                <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => {
                const confColor = getConfidenceColor(item.alt_confidence)
                // Calculate 30d change from recent sales (or fallback to alt_value)
                const sales = item.recent_sales && item.recent_sales.length > 0
                  ? item.recent_sales.map(s => s.price).reverse()
                  : [item.alt_value || 0]

                const firstPrice = sales[0] || 0
                const lastPrice = sales[sales.length - 1] || 0
                const changeAmt = lastPrice - firstPrice
                const changePct = firstPrice > 0 ? (changeAmt / firstPrice * 100) : 0
                const isUp = changePct >= 0

                return (
                  <tr
                    key={item.token_mint}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    onClick={() => openDealModal(item as any)}
                  >
                    {/* Card Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/30 flex-shrink-0 border border-white/5">
                          <Image src={item.img_url || ''} alt="" width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white group-hover:text-yellow-400 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{item.grading_company} · {item.grade}</p>
                        </div>
                      </div>
                    </td>

                    {/* Alt Value */}
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-accent-gold font-mono">{formatUsd(item.alt_value)}</p>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-bold font-mono ${confColor.text}`}>
                        {item.alt_confidence?.toFixed(0)}%
                      </span>
                    </td>

                    {/* Sparkline + Change */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <Sparkline data={sales} width={60} height={16} />
                        <span className={`text-[10px] font-bold font-mono flex items-center gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {isUp ? '+' : ''}{changePct.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Max Buy */}
                    <td className="px-4 py-3 text-right">
                      <p className="text-xs font-mono text-gray-300">{formatUsd(item.max_buy_price)}</p>
                    </td>

                    {/* Added */}
                    <td className="px-4 py-3 text-right">
                      <p className="text-[10px] text-gray-500">{timeAgo(item.added_at)}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={`https://magiceden.io/item-details/${item.token_mint}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-purple-400 transition-colors"
                          title="Magic Eden"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWatchlist(item.token_mint); }}
                          className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm animate-pulse font-mono">[Loading Watchlist from Redis A...]</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No cards in your watchlist yet.</p>
            <p className="text-gray-600 text-xs mt-1">Add cards from the Search or Deals tabs.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
