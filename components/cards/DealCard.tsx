'use client'

import Image from 'next/image'
import { TrendingDown, Croissant, Maximize2, BarChart3, DollarSign, Fingerprint } from 'lucide-react'
import { getTierColor, formatUsd, formatSol } from '@/lib/format'
import type { Deal } from '@/types'
import { useUI } from '@/context/UIContext'
import CopyButton from '@/components/ui/CopyButton'

interface DealCardProps {
  deal: Deal
  priority?: boolean
}

export default function DealCard({ deal, priority = false }: DealCardProps) {
  const { openDealModal, viewMode } = useUI()
  const tierColor = getTierColor(deal.tier)
  
  const discount = deal.alt_value && deal.alt_value > 0 ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100) : 0
  const profit = deal.alt_value ? (0.85 * deal.alt_value) - deal.listing_price_usd : 0

  // List View (Table Row style)
  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => openDealModal(deal)}
        className="group relative bg-surface hover:bg-surface-light border-b border-white/5 px-4 py-2.5 flex items-center gap-6 transition-all duration-200 cursor-pointer overflow-hidden text-xs"
      >
        {/* Tier Indicator Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${tierColor.bg} shadow-[0_0_8px_${tierColor.bg.split('-')[1]}]`} />
        
        <div className="relative w-10 h-10 rounded bg-black/30 flex-shrink-0 border border-white/5">
          <Image src={deal.img_url || ''} alt="" fill className="object-contain" unoptimized />
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-5 min-w-0">
             <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white truncate max-w-[200px] group-hover:text-accent-gold transition-colors">{deal.name}</span>
                <CopyButton text={deal.token_mint} className="opacity-0 group-hover:opacity-100" iconSize={10} />
             </div>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                {deal.grading_company} {deal.grade} · {deal.token_mint.slice(0, 8)}
                {deal.owner_tag && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase ${
                    deal.owner_tag === 'Cartel Member' ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {deal.owner_tag}
                  </span>
                )}
              </p>
          </div>

          <div className="col-span-2 text-right">
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black text-blue-400/80">Listing</p>
             <p className="font-bold text-white font-mono">{formatUsd(deal.listing_price_usd)}</p>
          </div>

          <div className="col-span-2 text-right">
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Alt Val</p>
             <p className="font-bold text-accent-gold font-mono">{formatUsd(deal.alt_value)}</p>
          </div>

          <div className="col-span-1 text-right">
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Disc</p>
             <p className={`font-black font-mono ${discount > 10 ? 'text-green-400' : 'text-gray-500'}`}>{discount.toFixed(0)}%</p>
          </div>

          <div className="col-span-2 text-right">
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Profit</p>
             <p className={`font-black font-mono ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatUsd(profit)}</p>
          </div>
        </div>
      </div>
    )
  }

  // Grid View (The Operator Card)
  return (
    <div 
      className="group relative bg-surface rounded-lg border border-white/5 overflow-hidden transition-all duration-300 cursor-pointer hover:border-white/20 shadow-2xl"
      onClick={() => openDealModal(deal)}
    >
      {/* Tier Indicator (Vertical Glowing Bar) */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] z-20 ${tierColor.bg} shadow-[0_0_15px_1px_rgba(255,215,0,0.3)] transition-all group-hover:w-[5px]`} 
           style={{ backgroundColor: tierColor.text.includes('gold') ? '#ffd700' : tierColor.bg === 'bg-white/10' ? '#6b7280' : undefined }} />

      {/* Visual Header - Industrial Container */}
      <div className="relative aspect-[5/4] w-full bg-black/60 overflow-hidden border-b border-white/5">
        <Image 
          src={deal.img_url || 'https://placehold.co/400x320/13111a/333?text=No+Image'} 
          alt={deal.name} 
          fill 
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-500 ease-out" 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority} 
          unoptimized 
        />
        
        {/* Subtle Bottom Gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-8" />
        
        <div className="absolute bottom-2 left-4 right-2 z-10">
           <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider drop-shadow-lg mb-0.5">{deal.grading_company} {deal.grade}</p>
                <h3 className="text-[11px] font-black text-white group-hover:text-accent-gold transition-colors line-clamp-1 truncate drop-shadow-xl">{deal.name}</h3>
              </div>
              <CopyButton text={deal.token_mint} className="opacity-0 group-hover:opacity-100 bg-black/60 border border-white/10" iconSize={10} />
           </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 items-end pt-2">
           {deal.owner_tag === 'Cartel Member' && (
             <div className="px-2 py-0.5 rounded text-[8px] font-black bg-accent-gold text-black shadow-[0_0_10px_rgba(255,215,0,0.3)] uppercase border border-accent-gold/40">
               Cartel Member
             </div>
           )}
           {deal.owner_tag === 'Mfer' && (
             <div className="px-2 py-0.5 rounded text-[8px] font-black bg-red-600 text-white shadow-xl uppercase border border-red-500/40">
               Mfer
             </div>
           )}
        </div>
      </div>

      {/* High-Density Metrics Deck */}
      <div className="p-3 bg-black/40 space-y-3">
        {/* Top Row: Prices */}
        <div className="grid grid-cols-3 gap-2">
           <div className="text-left">
              <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Listed</p>
              <p className="text-[11px] font-bold text-white font-mono">{formatUsd(deal.listing_price_usd)}</p>
           </div>
           <div className="text-center">
              <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Alt Val</p>
              <p className="text-[11px] font-bold text-accent-gold font-mono">{formatUsd(deal.alt_value)}</p>
           </div>
           <div className="text-right">
              <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Cartel Avg</p>
              <p className="text-[11px] font-bold text-gray-400 font-mono">{formatUsd(deal.cartel_avg || deal.alt_value * 0.98)}</p>
           </div>
        </div>

        {/* Bottom Row: Results */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
           <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${profit > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`} />
              <p className={`text-xs font-black font-mono ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profit > 0 ? '+' : ''}{formatUsd(profit)}
              </p>
           </div>
           <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded border border-white/5">
              <Croissant className="w-2.5 h-2.5 text-accent-gold" />
              <p className="text-[10px] font-black text-white font-mono">{discount.toFixed(0)}% OFF</p>
           </div>
        </div>
      </div>

      {/* Hover Inspect Indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
         <Maximize2 className="w-3 h-3 text-white/20" />
      </div>
    </div>
  )
}