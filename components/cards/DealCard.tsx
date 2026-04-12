'use client'
import { useState } from 'react'
import Image from 'next/image'
import { TrendingDown, Zap, Star } from 'lucide-react'
import { getTierColor, formatUsd, formatSol, timeAgo, getConfidenceColor } from '@/lib/format'
import type { Deal } from '@/types'
import { Tier } from '@/types'
import { useConnection } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'

// Buyer wallet is determined server-side from BUYER_WALLET_PRIVATE_KEY.
// The frontend doesn't need to know or manage the sniper address.

interface DealCardProps {
  deal: Deal
  solPriceUSD?: number
  priority?: boolean
  onClick?: () => void
}

const tierIcons: Record<string, string> = {
  [Tier.GOLD]: '🏆',
  [Tier.SILVER]: '🥈',
  [Tier.BRONZE]: '🥉',
  [Tier.IRON]: '⚙️',
  [Tier.SUSPICIOUS]: '⚠️',
  [Tier.NONE]: 'ℹ️',
  'INFO': 'ℹ️',
  [Tier.AUTOBUY]: '🤖',
}

export default function DealCard({ deal, solPriceUSD, priority = false, onClick }: DealCardProps) {
  const [isWatching, setIsWatching] = useState(false)
  const [isSniping, setIsSniping] = useState(false)
  const { connection } = useConnection()
  const tierColor = getTierColor(deal.tier)
  const confColor = getConfidenceColor(deal.alt_confidence)

  const handleSnipe = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSniping(true)
    const loadingToast = toast.loading('Building transaction...')
    try {
      // ── Call backend: build + sign + submit via Helius Sender ─────────────────
      // All Solana logic is server-side — no wallet popup, no Solflare Lighthouse
      // injection that was causing numRequiredSignatures=2 and validators dropping tx.
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: 'backend',  // overridden server-side from BUYER_WALLET_PRIVATE_KEY
          seller: deal.seller,
          tokenMint: deal.token_mint,
          price: deal.listing_price_sol,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')

      const { signature } = data
      if (!signature) throw new Error('No signature returned from backend')
      console.log('[Snipe] ✅ Submitted:', signature)

      // ── Poll for confirmation ─────────────────────────────────────────────────
      toast.loading('Confirming...', { id: loadingToast })
      let confirmed = false
      let failed = false

      for (let i = 0; i < 40 && !confirmed && !failed; i++) {
        await new Promise(r => setTimeout(r, 500))
        try {
          const s = await connection.getSignatureStatus(signature, { searchTransactionHistory: true })
          const status = s?.value
          console.log(`[Snipe] Status[${i}]:`, status?.confirmationStatus ?? 'null', status?.err ? `ERR: ${JSON.stringify(status.err)}` : 'ok')
          if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            if (status.err) { failed = true } else { confirmed = true }
          }
        } catch {}
      }

      const link = (
        <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer">
          View on Solscan →
        </a>
      )

      if (confirmed) {
        toast.success('🎉 Sniped!', { description: link, id: loadingToast })
      } else if (failed) {
        toast.error('❌ Tx landed but FAILED — check Solscan', { description: link, id: loadingToast })
      } else {
        toast.info('⏳ Submitted — check Solscan wallet page', { description: link, id: loadingToast })
      }
    } catch (err: any) {
      console.error('[Snipe] Error:', err)
      toast.error(err.message || 'Snipe failed', { id: loadingToast })
    } finally {
      setIsSniping(false)
    }
  }

  const discount = deal.alt_value && deal.alt_value > 0 ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100) : 0
  const profit = deal.alt_value ? (0.85 * deal.alt_value) - deal.listing_price_usd : 0
  const meLink = 'https://magiceden.io/item-details/' + deal.token_mint

  return (
    <div className={'group relative bg-surface rounded-xl border border-white/5 overflow-hidden card-hover-lift card-shine-effect ' + (onClick ? 'cursor-pointer' : '')} onClick={onClick}>
      <div className="relative w-full h-48 bg-black/40 overflow-hidden">
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 flex-wrap">
          <div className={'flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] tracking-wide font-bold bg-black/80 backdrop-blur-md border border-white/10 ' + tierColor.text}>
            <span>{tierIcons[deal.tier] || 'ℹ️'}</span><span>{deal.tier === 'NONE' ? 'INFO' : deal.tier}</span>
          </div>
          {deal.isCartel && <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/80 text-white backdrop-blur-md">CARTEL</div>}
          {deal.isCompetitor && <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-orange-500/80 text-white backdrop-blur-md">COMPETITOR</div>}
        </div>
        <button onClick={async (e) => { e.stopPropagation(); e.preventDefault(); setIsWatching(!isWatching); }} className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10">
          <Star className={'w-4 h-4 ' + (isWatching ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400')} />
        </button>
        <Image src={deal.img_url || 'https://placehold.co/400x560/13111a/333?text=No+Image'} alt={deal.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="100vw" priority={priority} unoptimized />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13111a] to-transparent" />
      </div>
      <div className="p-4 space-y-3">
        <div><h3 className="text-sm font-bold text-white truncate group-hover:text-accent-gold">{deal.name}</h3><p className="text-[11px] text-gray-500 font-mono">{deal.grading_company} · {deal.grade} · #{deal.grading_id}</p></div>
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div><p className="text-[9px] text-gray-500 uppercase">Listed</p><p className="text-sm font-bold text-white font-mono">{formatSol(deal.listing_price_sol)} <span className="text-gray-500 text-xs">({formatUsd(deal.listing_price_usd)})</span></p></div>
          <div className="text-right"><p className="text-[9px] text-gray-500 uppercase">Alt Value <span className={'text-[8px] ml-1 px-1 rounded ' + confColor.text}>{deal.alt_confidence ? deal.alt_confidence.toFixed(0) + '%' : 'N/A'}</span></p><p className="text-sm font-bold text-accent-gold font-mono">{formatUsd(deal.alt_value)}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={'flex-[0.8] py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ' + (discount >= 30 ? 'text-yellow-400' : discount >= 20 ? 'text-red-400' : discount >= 10 ? 'text-blue-400' : 'text-gray-400')}>
            <TrendingDown className="w-3.5 h-3.5" /><span>{discount.toFixed(1)}% off</span>
          </div>
          <div className={'flex-[1.2] py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ' + (profit > 20 ? 'text-green-400' : profit > 0 ? 'text-green-500/70' : 'text-red-400')}>
            {profit > 0 ? '🟢' : '🔴'}<span>{formatUsd(Math.abs(profit))} Profit</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 font-mono">{timeAgo(deal.listing_timestamp)}</span>
          <div className="flex gap-2 text-[10px] font-bold text-gray-500"><a href={'https://collectorcrypt.com/assets/solana/' + deal.token_mint} target="_blank">CC</a><span>·</span><a href={deal.alt_assest_id ? 'https://alt.xyz/itm/' + deal.alt_assest_id : 'https://alt.xyz'} target="_blank">ALT</a><span>·</span><a href={meLink} target="_blank" className="hover:text-accent-gold">ME</a></div>
        </div>
        <button disabled={isSniping || !deal.seller} onClick={handleSnipe} className="w-full py-2 rounded-lg bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/30 text-accent-gold text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {isSniping ? <div className="w-3.5 h-3.5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {isSniping ? 'SNIPING...' : 'SNIPE NOW'}
        </button>
      </div>
    </div>
  )
}