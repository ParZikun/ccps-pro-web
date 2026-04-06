'use client'

import { useState } from 'react'

import Image from 'next/image'
import { ExternalLink, TrendingDown, Shield, BarChart3, Clock, Zap, Star } from 'lucide-react'
import { getTierColor, formatUsd, formatSol, timeAgo, getConfidenceColor } from '@/lib/format'
import type { Deal } from '@/types'
import { Tier } from '@/types'

interface DealCardProps {
  deal: Deal
  solPriceUSD?: number
  priority?: boolean
}

const tierIcons: Record<string, string> = {
  [Tier.GOLD]: '🏆',
  [Tier.SILVER]: '🥈',
  [Tier.BRONZE]: '🥉',
  [Tier.IRON]: '⚙️',
  [Tier.SUSPICIOUS]: '⚠️',
  [Tier.NONE]: '—',
  [Tier.AUTOBUY]: '🤖',
}

export default function DealCard({ deal, solPriceUSD, priority = false }: DealCardProps) {
  const [isWatching, setIsWatching] = useState(false) // Optimistic state for tracking
  const tierColor = getTierColor(deal.tier)
  const confColor = getConfidenceColor(deal.alt_confidence)

  const discount = deal.alt_value && deal.alt_value > 0
    ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100)
    : 0
  const profit = deal.alt_value
    ? (0.85 * deal.alt_value) - deal.listing_price_usd
    : 0

  const meLink = `https://magiceden.io/item-details/${deal.token_mint}`

  return (
    <div className="group relative bg-surface rounded-xl border border-white/5 overflow-hidden card-hover-lift card-shine-effect">
      {/* Image Container */}
      <div className="relative w-full h-48 bg-black/40 overflow-hidden">
        {/* Tier Badge inside Image Container (Fixes z-index bug) */}
        <div className={`absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${tierColor.bg} ${tierColor.border} border ${tierColor.text}`}>
          <span>{tierIcons[deal.tier]}</span>
          <span>{deal.tier}</span>
        </div>

        {/* Watchlist Toggle */}
        <button
          onClick={async (e) => {
            e.stopPropagation()
            e.preventDefault()
            const newState = !isWatching
            setIsWatching(newState)
            try {
              if (newState) {
                await fetch(`/api/watchlist/test-wallet-123`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mint: deal.token_mint })
                })
              } else {
                await fetch(`/api/watchlist/test-wallet-123/${deal.token_mint}`, { method: 'DELETE' })
              }
            } catch (err) {}
          }}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 transition-colors backdrop-blur-sm"
        >
          <Star className={`w-4 h-4 ${isWatching ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 hover:text-white'}`} />
        </button>

        <Image
          src={deal.img_url || 'https://placehold.co/400x560/13111a/333?text=No+Image'}
          alt={deal.name}
          fill
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          priority={priority}
        />
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13111a] to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title + Grade */}
        <div>
          <h3 className="text-sm font-bold text-white truncate leading-tight group-hover:text-accent-gold transition-colors">
            {deal.name}
          </h3>
          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
            {deal.grading_company} · {deal.grade} · #{deal.grading_id}
          </p>
        </div>

        {/* Price + Alt Value Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Listed</p>
            <p className="text-base font-bold text-white font-mono">{formatSol(deal.listing_price_sol)}</p>
            <p className="text-[10px] text-gray-500 font-mono">{formatUsd(deal.listing_price_usd)}</p>
          </div>
          <div className="rounded-lg bg-black/30 p-2.5 border border-white/5">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Alt Value</p>
            <p className="text-base font-bold text-accent-gold font-mono">{formatUsd(deal.alt_value)}</p>
            <p className={`text-[10px] font-mono ${confColor.text}`}>
              {deal.alt_confidence ? `${deal.alt_confidence.toFixed(0)}% conf` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Discount + Profit Row */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
            discount >= 30 ? 'bg-yellow-500/10 text-yellow-400' :
            discount >= 20 ? 'bg-red-500/10 text-red-400' :
            discount >= 10 ? 'bg-blue-500/10 text-blue-400' :
            'bg-white/5 text-gray-400'
          }`}>
            <TrendingDown className="w-3 h-3" />
            <span>{discount.toFixed(1)}% off</span>
          </div>
          <div className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
            profit > 20 ? 'bg-green-500/10 text-green-400' :
            profit > 0 ? 'bg-green-500/5 text-green-500/70' :
            'bg-red-500/10 text-red-400'
          }`}>
            {profit > 0 ? '🟢' : '🔴'}
            <span>{formatUsd(Math.abs(profit))}</span>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(deal.listing_timestamp)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <BarChart3 className="w-3 h-3" />
            <span>Supply: {deal.supply}</span>
          </div>
          <div className="flex gap-2">
            <a
              href="https://store.collectorcrypt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
              title="Collector Crypt"
            >
              <ExternalLink className="w-3 h-3" />
              <span>CC</span>
            </a>
            <a
              href="https://alt.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
              title="Alt.xyz"
            >
              <ExternalLink className="w-3 h-3" />
              <span>ALT</span>
            </a>
            <a
              href={meLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-accent-gold transition-colors"
              title="Magic Eden"
            >
              <ExternalLink className="w-3 h-3" />
              <span>ME</span>
            </a>
          </div>
        </div>

        {/* Snipe Button (disabled for v1) */}
        <button
          disabled
          className="w-full py-2 rounded-lg bg-accent-gold/5 border border-accent-gold/10 text-accent-gold/40 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Zap className="w-3.5 h-3.5" />
          SNIPE — Coming Soon
        </button>
      </div>
    </div>
  )
}
