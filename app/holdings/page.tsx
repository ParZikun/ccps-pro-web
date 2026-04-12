'use client'

import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Package, Clock, ExternalLink, BarChart3, ArrowUpRight, Croissant, Shield } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import { formatUsd, formatSol, timeAgo, truncate } from '@/lib/format'
import Image from 'next/image'
import type { Holding } from '@/types'
import { useWallet } from '@solana/wallet-adapter-react'
import CopyButton from '@/components/ui/CopyButton'

export default function HoldingsPage() {
  const { openDealModal } = useUI()
  const { publicKey } = useWallet()
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [personalInventory, setPersonalInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPersonal, setLoadingPersonal] = useState(false)

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

  useEffect(() => {
    if (!publicKey) {
      setPersonalInventory([])
      return
    }

    const loadPersonal = async () => {
      setLoadingPersonal(true)
      try {
        // 1. Fetch from ME API
        const res = await fetch(`https://api-mainnet.magiceden.dev/v2/wallets/${publicKey.toBase58()}/tokens`)
        if (res.ok) {
          const rawTokens = await res.json()
          
          // 2. Fetch known metadata from Redis A in bulk
          const mints = rawTokens.map((t: any) => t.mintAddress)
          const marketSyncRes = await fetch('/api/cards/mints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mints })
          })

          let marketDataMap: Record<string, any> = {}
          if (marketSyncRes.ok) {
            const marketData = await marketSyncRes.json()
            marketData.forEach((card: any) => {
              marketDataMap[card.token_mint] = card
            })
          }

          // 3. Merge data
          const enrichedTokens = rawTokens.map((t: any) => {
            const brainData = marketDataMap[t.mintAddress]
            return {
              token_mint: t.mintAddress,
              name: t.name,
              img_url: t.image,
              grade: brainData?.grade || 'SCANNING',
              grading_company: brainData?.grading_company || 'ON-CHAIN',
              alt_value: brainData?.alt_value || 0,
              alt_asset_id: brainData?.alt_asset_id,
              cartel_avg: brainData?.cartel_avg || 0,
              price_history: brainData?.price_history || [],
              buy_price_sol: 0,
              buy_price_usd: 0,
              buy_timestamp: Date.now(),
              buy_signature: '',
              status: 'held',
              isKnown: !!brainData
            }
          })

          setPersonalInventory(enrichedTokens)
        }
      } catch (err) {
        console.error('Failed to load personal inventory:', err)
      } finally {
        setLoadingPersonal(false)
      }
    }
    loadPersonal()
  }, [publicKey])

  const stats = {
    totalCards: holdings.filter(h => h.status === 'held').length,
    totalListed: holdings.filter(h => h.status === 'listed').length,
    totalSold: holdings.filter(h => h.status === 'sold').length,
    personalCount: personalInventory.length
  }

  return (
    <div className="space-y-8 page-transition pb-20 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
            <Croissant className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">Operator Holdings</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
              Bot Sniped Inventory & Managed Assets
              <span className="text-[9px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
                ACTIVE PIPELINE
              </span>
            </p>
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          <HoldingsStat label="Held" value={stats.totalCards} color="text-white" />
          <HoldingsStat label="Listed" value={stats.totalListed} color="text-purple-400" />
          <HoldingsStat label="Sold" value={stats.totalSold} color="text-green-400" />
          <HoldingsStat label="Vault" value={stats.personalCount} color="text-accent-gold" />
        </div>
      </div>

      {/* Bot Success Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
           <Shield className="w-3.5 h-3.5 text-blue-400" />
           <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Deployment Success (Bot Snipes)</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          ) : holdings.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-white/10 p-12 text-center bg-black/20">
              <Package className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-xs uppercase font-black">No Active Snipes Found</p>
              <p className="text-gray-600 text-[10px] mt-1 italic">Bot deployment waiting for tiered delta.</p>
            </div>
          ) : (
            holdings.map((holding) => (
              <HoldingCard key={holding.token_mint} holding={holding} onOpen={openDealModal} />
            ))
          )}
        </div>
      </section>

      {/* Personal Portfolio Section - The Wallet Mirror */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
           <Wallet className="w-3.5 h-3.5 text-accent-gold" />
           <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Personal Inventory (Wallet Mirror)</h2>
        </div>
        
        {!publicKey ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center bg-black/20">
             <p className="text-gray-500 text-[10px] uppercase font-black">Sync with Wallet to Scan Holdings</p>
          </div>
        ) : loadingPersonal ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : personalInventory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center bg-black/20">
             <p className="text-gray-500 text-[10px] uppercase font-black">No on-chain assets detected in this wallet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {personalInventory.map((item) => (
              <HoldingCard 
                key={item.token_mint} 
                holding={item} 
                onOpen={openDealModal} 
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function HoldingsStat({ label, value, color }: any) {
  return (
    <div className="px-6 py-3 rounded-xl bg-surface/30 border border-white/5 flex flex-col items-center group hover:border-white/10 transition-all">
      <p className={`text-2xl font-black tabular-nums font-mono ${color}`}>{value}</p>
      <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{label}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface/30 rounded-xl border border-white/5 overflow-hidden animate-pulse">
      <div className="w-full aspect-[5/7] bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  )
}

function HoldingCard({ holding, onOpen }: { holding: any; onOpen: (h: any) => void }) {
  return (
    <div
      className="bg-surface/40 rounded-xl border border-white/5 overflow-hidden group cursor-pointer hover:border-accent-gold/20 transition-all shadow-xl"
      onClick={() => onOpen(holding)}
    >
      <div className="relative w-full aspect-[5/7] bg-black/60 overflow-hidden flex items-center justify-center">
        <Image
          src={holding.img_url || 'https://placehold.co/400x560/13111a/333?text=UNAVAILABLE'}
          alt={holding.name}
          fill
          className="object-contain p-2"
          unoptimized
        />
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
            holding.status === 'held' ? 'bg-green-500/80 text-white' :
            holding.status === 'listed' ? 'bg-purple-500/80 text-white' :
            'bg-blue-500/80 text-white'
          }`}>
            {holding.status}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <CopyButton text={holding.token_mint} className="bg-black/60 border border-white/10" iconSize={10} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none opacity-50" />
      </div>

      <div className="p-4 space-y-4">
        <div className="min-h-[2.5rem]">
          <h3 className="text-xs font-black text-white leading-tight uppercase line-clamp-2">{holding.name}</h3>
          <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-1">
            {holding.grading_company} · {holding.grade}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-white/5 border border-white/5">
            <p className="text-[8px] text-gray-600 uppercase font-black">Buy/Acq</p>
            <p className="text-white font-mono font-black">{holding.buy_price_sol > 0 ? formatSol(holding.buy_price_sol) : 'SELF-CUST'}</p>
          </div>
          {holding.status === 'listed' ? (
            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
              <p className="text-[8px] text-purple-400 uppercase font-black">Listed</p>
              <p className="text-purple-400 font-mono font-black">{formatSol(holding.listed_price_sol || 0)}</p>
            </div>
          ) : holding.status === 'sold' ? (
            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
              <p className="text-[8px] text-green-400 uppercase font-black">Sold</p>
              <p className="text-green-400 font-mono font-black">{formatSol(holding.listed_price_sol || 0)}</p>
            </div>
          ) : (
            <div className="p-2 rounded bg-accent-gold/5 border border-accent-gold/10">
              <p className="text-[8px] text-accent-gold uppercase font-black">Est. Value</p>
              <p className="text-accent-gold font-mono font-black">
                {formatUsd(holding.alt_value || holding.buy_price_usd || 0)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] text-gray-600 pt-2 border-t border-white/5 uppercase font-black">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(holding.buy_timestamp)}
          </span>
          <a
            href={holding.buy_signature ? `https://solscan.io/tx/${holding.buy_signature}` : `https://magiceden.io/item-details/${holding.token_mint}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors uppercase"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            V-CHECK
          </a>
        </div>
      </div>
    </div>
  )
}
