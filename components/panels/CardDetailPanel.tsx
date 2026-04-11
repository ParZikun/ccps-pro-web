'use client'

import React from 'react'
import Image from 'next/image'
import { ExternalLink, Star, Shield, BarChart3, TrendingDown } from 'lucide-react'
import Sparkline from '@/components/ui/Sparkline'
import { formatUsd, truncate } from '@/lib/format'

interface CardDetailPanelProps {
  card: any
  onClose: () => void
  onRemove?: () => void
  onAdd?: () => void
  isWatched?: boolean
}

export default function CardDetailPanel({ card, onClose, onRemove, onAdd, isWatched }: CardDetailPanelProps) {
  if (!card) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-[80] glass border-l border-white/10 overflow-y-auto animate-slideInRight custom-scrollbar">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{card.name}</h2>
              <p className="text-xs text-gray-500 font-mono">
                {card.grading_company} · {card.grade} {card.grading_id && `· #${card.grading_id}`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <span className="text-lg leading-none">✕</span>
            </button>
          </div>

          <div className="rounded-xl overflow-hidden bg-black/30 border border-white/5">
            <Image 
              src={card.img_url || 'https://placehold.co/400x560/13111a/333'} 
              alt={card.name} 
              width={400} 
              height={560} 
              className="w-full h-auto object-contain" 
            />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
              <p className="text-[9px] text-gray-500 uppercase font-semibold mb-1">Alt Value</p>
              <p className="text-xl font-bold text-accent-gold font-mono leading-none">{formatUsd(card.alt_value)}</p>
            </div>
            {card.insured_value ? (
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-semibold mb-1">Insured</p>
                <p className="text-xl font-bold text-white font-mono leading-none">{formatUsd(card.insured_value)}</p>
              </div>
            ) : (
               <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                 <p className="text-[9px] text-gray-500 uppercase font-semibold mb-1">Listed (SOL)</p>
                 <p className="text-xl font-bold text-white font-mono leading-none">{card.listing_price_sol || 'N/A'}</p>
               </div>
            )}
          </div>

          <div className="space-y-2">
            {[
              { label: 'Confidence', value: card.alt_confidence ? `${card.alt_confidence.toFixed(1)}%` : 'N/A', icon: BarChart3 },
              { label: 'Range', value: card.alt_lower_bound ? `${formatUsd(card.alt_lower_bound)} — ${formatUsd(card.alt_upper_bound)}` : 'N/A', icon: TrendingDown },
              { label: 'Supply', value: card.supply?.toString() || 'N/A', icon: Shield },
              { label: 'Cartel Avg', value: card.cartel_avg ? formatUsd(card.cartel_avg) : 'N/A', icon: BarChart3 },
              { label: 'Max Buy Price', value: card.max_buy_price ? formatUsd(card.max_buy_price) : 'N/A', icon: Star },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/10 border border-white/[0.03]">
                <span className="flex items-center gap-2 text-xs text-gray-400"><row.icon className="w-3.5 h-3.5" />{row.label}</span>
                <span className="text-xs font-mono text-white">{row.value}</span>
              </div>
            ))}
          </div>

          {card.recent_sales && card.recent_sales.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2 flex flex-wrap justify-between items-center">
                <span>Recent Sales</span>
                <span className="normal-case text-[10px] text-gray-600">sales history</span>
              </p>
              <div className="w-full h-16 mb-3 bg-black/20 rounded-lg p-2 border border-white/5 flex items-center justify-center overflow-visible">
                <Sparkline data={card.recent_sales.map((s: any) => s.price).reverse()} width={350} height={40} />
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {card.recent_sales.map((sale: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 px-3 rounded bg-black/10 border border-white/[0.03] text-xs">
                    <span className="text-gray-500 font-mono">{sale.date}</span>
                    <span className="text-white font-mono">{formatUsd(sale.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-white/5">
            {card.token_mint ? (
              <a href={`https://magiceden.io/item-details/${card.token_mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors">
                <ExternalLink className="w-3 h-3" /> Magic Eden
              </a>
            ) : null}
            
            {onRemove && (
              <button onClick={onRemove} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                Remove
              </button>
            )}
            {onAdd && !isWatched && (
              <button onClick={onAdd} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-medium hover:bg-yellow-500/20 transition-colors">
                <Star className="w-3 h-3" /> Watch
              </button>
            )}
            
          </div>

          {card.token_mint && (
            <p className="text-[10px] text-gray-600 font-mono text-center">Mint: {truncate(card.token_mint, 10, 6)}</p>
          )}
        </div>
      </div>
    </>
  )
}
