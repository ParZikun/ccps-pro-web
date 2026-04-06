'use client'

import { useState, useMemo } from 'react'
import { Star, TrendingUp, TrendingDown, Trash2, ExternalLink, BarChart3, Search, Plus } from 'lucide-react'
import { formatUsd, getConfidenceColor, timeAgo, truncate } from '@/lib/format'
import type { WatchlistItem } from '@/types'
import { useEffect } from 'react'
import Image from 'next/image'

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)
  const [searchFilter, setSearchFilter] = useState('')

  const filteredList = useMemo(() => {
    if (!searchFilter) return watchlist
    const q = searchFilter.toLowerCase()
    return watchlist.filter((item: WatchlistItem) =>
      item.name.toLowerCase().includes(q) ||
      item.grading_id.includes(q)
    )
  }, [watchlist, searchFilter])

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

  const removeFromWatchlist = async (mint: string) => {
    // Optimistic UI update
    setWatchlist(prev => prev.filter(item => item.token_mint !== mint))
    if (selectedItem?.token_mint === mint) setSelectedItem(null)

    // Backend call
    try {
      await fetch(`/api/watchlist/${wallet}/${mint}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to remove from watchlist', err)
    }
  }

  // Calculate totals
  const totalValue = watchlist.reduce((sum, item) => sum + (item.alt_value || 0), 0)
  const avgConfidence = watchlist.length > 0
    ? watchlist.reduce((sum, item) => sum + (item.alt_confidence || 0), 0) / watchlist.length
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
                // Calculate 30d change from price history
                const priceHistory = item.price_history || []
                const firstPrice = priceHistory[0]?.alt_value || item.alt_value || 0
                const lastPrice = priceHistory[priceHistory.length - 1]?.alt_value || item.alt_value || 0
                const changeAmt = lastPrice - firstPrice
                const changePct = firstPrice > 0 ? (changeAmt / firstPrice * 100) : 0
                const isUp = changePct >= 0

                return (
                  <tr
                    key={item.token_mint}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    onClick={() => setSelectedItem(item)}
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
                        {/* Mini sparkline */}
                        <div className="flex items-end gap-[1px] h-5">
                          {priceHistory.slice(-14).map((point: any, i: number) => {
                            const min = Math.min(...priceHistory.slice(-14).map((p: any) => p.alt_value))
                            const max = Math.max(...priceHistory.slice(-14).map((p: any) => p.alt_value))
                            const range = max - min || 1
                            const height = ((point.alt_value - min) / range) * 100
                            return (
                              <div
                                key={i}
                                className={`w-1 rounded-full ${isUp ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                                style={{ height: `${Math.max(height, 8)}%` }}
                              />
                            )
                          })}
                        </div>
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
                          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.token_mint); }}
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

      {/* Detail Panel */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setSelectedItem(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg z-[80] glass border-l border-yellow-500/10 overflow-y-auto animate-slideInRight custom-scrollbar">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Watching</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedItem.name}</h2>
                  <p className="text-xs text-gray-500 font-mono">{selectedItem.grading_company} · {selectedItem.grade}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                  <span className="text-lg">✕</span>
                </button>
              </div>

              {/* Image */}
              <div className="rounded-xl overflow-hidden bg-black/30 border border-white/5">
                <Image src={selectedItem.img_url || ''} alt={selectedItem.name} width={400} height={560} className="w-full object-contain" />
              </div>

              {/* Price History Chart */}
              {selectedItem.price_history && selectedItem.price_history.length > 0 && (
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-yellow-400" />
                    30-Day Price History
                  </h3>
                  <div className="flex items-end gap-[2px] h-28">
                    {selectedItem.price_history.map((point, i) => {
                      const min = Math.min(...selectedItem.price_history!.map(p => p.alt_value))
                      const max = Math.max(...selectedItem.price_history!.map(p => p.alt_value))
                      const range = max - min || 1
                      const height = ((point.alt_value - min) / range) * 100
                      const lastVal = selectedItem.price_history![selectedItem.price_history!.length - 1]?.alt_value || 0
                      const firstVal = selectedItem.price_history![0]?.alt_value || 0
                      const isUp = lastVal >= firstVal

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          <div
                            className={`w-full rounded-sm ${isUp ? 'bg-green-500/40 hover:bg-green-500/60' : 'bg-red-500/40 hover:bg-red-500/60'} transition-colors`}
                            style={{ height: `${Math.max(height, 3)}%` }}
                          />
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 px-2 py-1 rounded text-[9px] text-white font-mono whitespace-nowrap z-10 border border-white/10">
                            {point.date}: {formatUsd(point.alt_value)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 font-mono">
                    <span>{selectedItem.price_history[0].date}</span>
                    <span>{selectedItem.price_history[selectedItem.price_history.length - 1].date}</span>
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Current Alt Value</p>
                  <p className="text-lg font-bold text-accent-gold font-mono">{formatUsd(selectedItem.alt_value)}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Max Buy Price</p>
                  <p className="text-lg font-bold text-white font-mono">{formatUsd(selectedItem.max_buy_price)}</p>
                </div>
              </div>

              {/* Recent Sales */}
              {selectedItem.recent_sales && selectedItem.recent_sales.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Recent Sales</p>
                  <div className="space-y-1">
                    {selectedItem.recent_sales.map((sale, i) => (
                      <div key={i} className="flex justify-between py-1.5 px-3 rounded bg-black/10 border border-white/[0.03] text-xs">
                        <span className="text-gray-500 font-mono">{sale.date}</span>
                        <span className="text-white font-mono">{formatUsd(sale.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2">
                <a href={`https://magiceden.io/item-details/${selectedItem.token_mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Magic Eden
                </a>
                <button
                  onClick={() => removeFromWatchlist(selectedItem.token_mint)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
