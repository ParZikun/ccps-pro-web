'use client'

import React, { useState, useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Drawer } from 'vaul'
import { X, ExternalLink, Croissant, TrendingUp, DollarSign, Calculator, Info, Shield, BarChart3, Box, Target, AlertTriangle } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import Image from 'next/image'
import PriceChart from '@/components/charts/PriceChart'
import { formatUsd, formatSol, getTierColor } from '@/lib/format'
import { toast } from 'sonner'
import { useConnection } from '@solana/wallet-adapter-react'

export default function CardModal() {
  const { selectedDeal, closeDealModal } = useUI()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!selectedDeal) return null

  const content = <ModalContent deal={selectedDeal} isMobile={isMobile} />

  if (isMobile) {
    return (
      <Drawer.Root open={!!selectedDeal} onOpenChange={(open) => !open && closeDealModal()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[96vh] bg-[#0c0a15] border-t border-white/10 rounded-t-[32px] z-[101] flex flex-col focus:outline-none shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20 my-4" />
            <div className="overflow-y-auto px-4 pb-12 custom-scrollbar">
              {content}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return (
    <Dialog.Root open={!!selectedDeal} onOpenChange={(open) => !open && closeDealModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl max-h-[95vh] bg-[#0c0a15] border border-white/10 rounded-[24px] shadow-[0_0_100px_rgba(0,0,0,0.8)] z-[101] overflow-hidden flex flex-col animate-in zoom-in-95 duration-250 focus:outline-none">
          <div className="absolute top-6 right-6 z-[102]">
            <button onClick={closeDealModal} className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-gray-400 hover:text-white transition-all group">
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {content}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ModalContent({ deal, isMobile }: { deal: any, isMobile: boolean }) {
  const [isSniping, setIsSniping] = useState(false)
  const [manualBid, setManualBid] = useState(deal.manual_bid_value || '')
  const [isSavingBid, setIsSavingBid] = useState(false)
  const [config, setConfig] = useState<any>(null)
  
  const tierColor = getTierColor(deal.tier)

  useEffect(() => {
    fetch('/api/config/global').then(res => res.json()).then(setConfig).catch(console.error)
  }, [])

  // Normalize data for Watchlist items (Redis A) vs Deals (Redis B)
  // Convert recent_sales to chart format (Real-time history from Redis A)
  const chartData = useMemo(() => {
    const rawHistory = deal.recent_sales || deal.price_history || []
    if (rawHistory.length > 0) {
      return rawHistory.map((s: any) => {
        // Sanitize date to YYYY-MM-DD for lightweight-charts
        let timeStr = s.date || s.time;
        if (typeof timeStr === 'string' && timeStr.includes('T')) {
          timeStr = timeStr.split('T')[0];
        }
        
        return {
          time: timeStr,
          value: Number(s.price || s.alt_value || s.value || 0)
        };
      }).sort((a: any, b: any) => a.time.localeCompare(b.time))
    }
    // Fallback if no history
    return [{ time: new Date().toISOString().split('T')[0], value: deal.alt_value || 0 }]
  }, [deal])
  const isListed = deal.listing_price_sol > 0 && !!deal.seller
  
  // Logic: (Alt Value * 0.85) - Listed Price
  const buybackMultiplier = 0.85
  const buybackValue = (deal.alt_value || 0) * buybackMultiplier
  const netProfit = isListed ? (buybackValue - deal.listing_price_usd) : 0
  const profitMargin = (isListed && buybackValue > 0 && deal.listing_price_usd > 0) ? (netProfit / deal.listing_price_usd) * 100 : 0
  
  const discount = (isListed && deal.alt_value) ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100) : 0

  // Fee Calculations
  const meFeeUsd = deal.listing_price_usd * 0.02
  const royaltyUsd = config?.buy?.payRoyalties === false ? 0 : (deal.listing_price_usd * 0.05) // Estimate 5% if not provided
  const tipSol = config?.buy?.priorityFeeMicroLamports ? (config.buy.priorityFeeMicroLamports * 200000 / 1e15) : 0.001 // Simplified estimate
  const totalFeesUsd = meFeeUsd + royaltyUsd

  const handleSaveBid = async () => {
    setIsSavingBid(true)
    try {
      const res = await fetch(`/api/config/bids/${deal.token_mint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_bid_value: manualBid ? parseFloat(manualBid as string) : null }),
      })
      if (res.ok) toast.success('Safe buy limit updated')
      else throw new Error('Failed to update bid')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSavingBid(false)
    }
  }

  const handleSnipe = async () => {
    setIsSniping(true)
    const loadingToast = toast.loading('Building neural transaction...')
    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller: deal.seller,
          tokenMint: deal.token_mint,
          price: deal.listing_price_sol,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Execution engine refused request')
      toast.success('Transaction submitted to chain!', { description: `Signature: ${data.signature?.slice(0, 16)}...`, id: loadingToast })
    } catch (err: any) {
      toast.error(err.message || 'Execution failed', { id: loadingToast })
    } finally {
      setIsSniping(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-full font-mono bg-[#0c0a15]">
      {/* Left Column: Media & Identity */}
      <div className="lg:w-[32%] p-6 lg:p-8 bg-black/40 flex flex-col border-b lg:border-b-0 lg:border-r border-white/5">
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 bg-[#13111a] shadow-2xl group/img mb-6">
          <Image src={deal.img_url || 'https://placehold.co/400x400/13111a/333?text=UNAVAILABLE'} alt={deal.name} fill className="object-contain p-2" unoptimized />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white leading-tight uppercase tracking-tight">{deal.name}</h2>
            <div className="flex flex-wrap items-center gap-2 pt-1">
               <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black border ${tierColor.bg} ${tierColor.text} ${tierColor.border} backdrop-blur-md shadow-lg`}>
                 {deal.tier}
               </span>
               <span className="text-[10px] font-black text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded border border-accent-gold/20 uppercase">
                 {deal.grading_company} {deal.grade}
               </span>
               <span className="text-[10px] text-gray-500 font-bold tracking-widest">
                 ID: {deal.grading_id}
               </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Token Mint Address</label>
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-white/5 group">
                <code className="text-[9px] text-gray-400 truncate flex-1">{deal.token_mint}</code>
                <button onClick={() => { navigator.clipboard.writeText(deal.token_mint); toast.success('Address copied') }} className="text-gray-600 hover:text-white transition-colors">
                  <BarChart3 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://magiceden.io/item-details/${deal.token_mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest"
              >
                <ExternalLink className="w-3.5 h-3.5" /> ME
              </a>
              
              <a
                href={deal.alt_asset_id ? `https://alt.xyz/itm/${deal.alt_asset_id}/research?grade=${(deal.grading_company || 'PSA').toUpperCase()}-${deal.grade}` : '#'}
                target={deal.alt_asset_id ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${
                  deal.alt_asset_id 
                    ? 'bg-accent-gold/5 border-accent-gold/20 text-accent-gold hover:bg-accent-gold/10 hover:border-accent-gold/40' 
                    : 'bg-white/5 border-white/5 text-gray-700 cursor-not-allowed'
                }`}
                onClick={(e) => !deal.alt_asset_id && e.preventDefault()}
              >
                <BarChart3 className="w-3.5 h-3.5" /> ALT
              </a>

              <a
                href={`https://cc-prod.vercel.app/asset/${deal.token_mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest"
              >
                <Info className="w-3.5 h-3.5" /> CC
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Data Hub */}
      <div className="lg:w-[68%] p-6 lg:p-8 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
        {/* Metric Grid Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HighDensityMetric label="Listing Price" value={isListed ? formatUsd(deal.listing_price_usd) : "NOT LISTED"} sub={isListed ? `${(deal.listing_price_sol || 0).toFixed(2)} SOL` : "N/A"} icon={DollarSign} color={isListed ? "text-white" : "text-red-400"} />
          <HighDensityMetric label="Alt Value" value={formatUsd(deal.alt_value)} sub={`${deal.alt_confidence}% Conf.`} icon={Target} color="text-accent-gold" />
          <HighDensityMetric label="Cartel Avg" value={formatUsd(deal.cartel_avg || 0)} sub="System Benchmark" icon={Shield} color="text-blue-400" />
          <HighDensityMetric label="Net Discount" value={isListed ? `${discount.toFixed(1)}%` : "N/A"} sub={isListed ? (discount > 0 ? "Below Market" : "Premium") : "Asset Inactive"} icon={TrendingUp} color={isListed && discount > 25 ? "text-green-400" : "text-gray-400"} />
        </div>

        {/* Technical Data & Manual Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-accent-gold" /> Transaction Forecast
             </h3>
             <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                <FeeRow label="ME Platform Fee (2%)" sol={`~${((deal.listing_price_sol || 0) * 0.02).toFixed(3)}`} usd={formatUsd(meFeeUsd)} />
                <FeeRow label="Creator Royalties" sol={`~${((deal.listing_price_sol || 0) * 0.05).toFixed(3)}`} usd={formatUsd(royaltyUsd)} />
                <FeeRow label="Network Prio/Tip" sol={`${tipSol.toFixed(3)}`} usd={`~$${(tipSol * 150).toFixed(2)}`} />
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[9px] font-black text-white uppercase">Total Adj. Price</span>
                   <span className="text-xs font-black text-accent-gold">{formatUsd(deal.listing_price_usd + totalFeesUsd)}</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-purple-400" /> Card Buy Override
             </h3>
             <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-2">
                   <div className="flex-1">
                      <label className="text-[8px] text-gray-500 font-bold uppercase block mb-1">Manual Buy Limit (USD)</label>
                      <input 
                        type="number" 
                        value={manualBid} 
                        onChange={(e) => setManualBid(e.target.value)}
                        placeholder="Set custom limit..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-purple-500 transition-colors"
                      />
                   </div>
                   <button 
                    onClick={handleSaveBid}
                    disabled={isSavingBid}
                    className="self-end px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-all"
                   >
                     {isSavingBid ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Croissant className="w-4 h-4 fill-current rotate-12" />}
                   </button>
                </div>
                <p className="text-[10px] text-gray-500 font-bold italic leading-tight">
                  IF SET: The sniper will ignore Alt values and only execute at or below this limit.
                  IF EMPTY: Defaulting to Safe Max Bid ({formatUsd(buybackValue)}).
                </p>
             </div>
          </div>
        </div>

        {/* Price History Visualization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Market Intensity vs System Benchmark
            </h3>
          </div>
          <div className="bg-black/40 rounded-xl border border-white/5 p-2">
            <PriceChart 
              data={chartData} 
              cartelAvg={deal.cartel_avg} 
              currentPrice={isListed ? deal.listing_price_usd : 0}
              manualBid={manualBid ? parseFloat(manualBid as string) : undefined}
              color="#3b82f6" 
            />
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-2">
          <button 
            disabled={isSniping || !isListed} 
            onClick={handleSnipe} 
            className="w-full py-4 rounded-xl bg-accent-gold hover:bg-accent-gold/90 disabled:bg-gray-800 disabled:text-gray-600 text-black text-xs font-black flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(255,215,0,0.1)] group active:scale-[0.98] uppercase tracking-widest"
          >
            {isSniping ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Croissant className="w-4 h-4 fill-current rotate-12" />}
            {isSniping ? 'Processing Neural Snipe...' : (isListed ? 'SNIPE ASSET' : 'ASSET NOT LISTED')}
          </button>
        </div>
      </div>
    </div>
  )
}

function FeeRow({ label, sol, usd }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-gray-500 font-bold uppercase">{label}</span>
      <div className="text-right">
        <p className="text-[10px] font-black text-gray-300">{sol} SOL</p>
        <p className="text-[8px] text-gray-600 font-bold">{usd}</p>
      </div>
    </div>
  )
}

function HighDensityMetric({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.07] transition-colors">
      <p className="text-[8px] text-gray-600 uppercase font-black tracking-tighter flex items-center gap-1.5 mb-1.5">
        <Icon className="w-2.5 h-2.5" /> {label}
      </p>
      <p className={`text-sm font-black transition-colors ${color}`}>{value}</p>
      <p className="text-[9px] text-gray-600 font-bold tabular-nums mt-0.5">{sub}</p>
    </div>
  )
}

function DeepMetric({ label, value, sub }: any) {
  return (
    <div className="bg-black/20 p-3 hover:bg-black/40 transition-colors">
      <p className="text-[8px] text-gray-600 uppercase font-black mb-1">{label}</p>
      <p className="text-xs font-bold text-gray-200">{value || 'N/A'}</p>
      <p className="text-[8px] text-gray-700 font-bold uppercase tracking-tighter mt-0.5">{sub}</p>
    </div>
  )
}
