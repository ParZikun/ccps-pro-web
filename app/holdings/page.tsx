'use client'

import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Package, Clock, ExternalLink, BarChart3, ArrowUpRight } from 'lucide-react'
import { formatUsd, formatSol, timeAgo, truncate } from '@/lib/format'
import Image from 'next/image'
import type { Holding } from '@/types'

const EMPTY_HOLDINGS: Holding[] = [
  {
    token_mint: '',
    name: 'No holdings yet',
    img_url: null,
    grade: '',
    grading_company: '',
    buy_price_sol: 0,
    buy_price_usd: 0,
    buy_timestamp: 0,
    buy_signature: '',
    status: 'held'
  }
]

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [totalValue, setTotalValue] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)

  useEffect(() => {
    const loadHoldings = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/holdings')
        if (res.ok) {
          const data = await res.json()
          setHoldings(data.holdings || [])
        }
      } catch (err) {
        console.error('Failed to load holdings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadHoldings()
  }, [])

  const stats = {
    totalCards: holdings.filter(h => h.status === 'held').length,
    totalListed: holdings.filter(h => h.status === 'listed').length,
    totalSold: holdings.filter(h => h.status === 'sold').length,
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
            <Wallet className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Holdings</h1>
            <p className="text-sm text-gray-400">
              Your portfolio and transaction history
              <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
                Auto-synced
              </span>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-center">
            <p className="text-lg font-bold text-white">{stats.totalCards}</p>
            <p className="text-[10px] text-gray-500 uppercase">Held</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-center">
            <p className="text-lg font-bold text-purple-400">{stats.totalListed}</p>
            <p className="text-[10px] text-gray-500 uppercase">Listed</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-center">
            <p className="text-lg font-bold text-green-400">{stats.totalSold}</p>
            <p className="text-[10px] text-gray-500 uppercase">Sold</p>
          </div>
        </div>
      </div>

      {/* Holdings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-white/5 overflow-hidden animate-pulse">
              <div className="w-full aspect-[5/7] bg-white/5" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : holdings.length === 0 ? (
          <div className="col-span-full rounded-xl bg-surface border border-white/5 p-12 text-center">
            <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">No holdings yet</p>
            <p className="text-gray-600 text-sm mt-1">Successfully sniped cards will appear here</p>
          </div>
        ) : (
          holdings.map((holding) => (
            <div
              key={holding.token_mint}
              className="bg-surface rounded-xl border border-white/5 overflow-hidden group"
            >
              <div className="relative w-full aspect-[5/7] bg-black/30 overflow-hidden">
                <Image
                  src={holding.img_url || 'https://placehold.co/400x560/13111a/333?text=No+Image'}
                  alt={holding.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    holding.status === 'held' ? 'bg-green-500/80 text-white' :
                    holding.status === 'listed' ? 'bg-purple-500/80 text-white' :
                    'bg-blue-500/80 text-white'
                  }`}>
                    {holding.status.toUpperCase()}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13111a] to-transparent pointer-events-none" />
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white truncate">{holding.name}</h3>
                  <p className="text-[10px] text-gray-500 font-mono">{holding.grading_company} · {holding.grade}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-black/20">
                    <p className="text-[9px] text-gray-500 uppercase">Buy Price</p>
                    <p className="text-white font-mono font-bold">{formatSol(holding.buy_price_sol)}</p>
                  </div>
                  {holding.status === 'listed' ? (
                    <div className="p-2 rounded bg-black/20">
                      <p className="text-[9px] text-gray-500 uppercase">Listed At</p>
                      <p className="text-purple-400 font-mono font-bold">{formatSol(holding.listed_price_sol || 0)}</p>
                    </div>
                  ) : holding.status === 'sold' ? (
                    <div className="p-2 rounded bg-black/20">
                      <p className="text-[9px] text-gray-500 uppercase">Sold For</p>
                      <p className="text-green-400 font-mono font-bold">{formatSol(holding.listed_price_sol || 0)}</p>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-black/20">
                      <p className="text-[9px] text-gray-500 uppercase">Est. Profit</p>
                      <p className={`font-mono font-bold ${(holding.profit_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatUsd(Math.abs(holding.profit_usd || 0))}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(holding.buy_timestamp)}
                  </span>
                  <a
                    href={`https://solscan.io/tx/${holding.buy_signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Tx
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
