'use client'

import { LayoutDashboard, TrendingUp, Croissant, Target, Zap, Clock, ArrowUpRight, Activity, Terminal, Shield, Wifi, Globe, Box, Cpu, Search, ChevronDown, SlidersHorizontal, ArrowUpDown, X, Filter } from 'lucide-react'
import { getTierColor, formatUsd, timeAgo } from '@/lib/format'
import { Tier } from '@/types'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useUI } from '@/context/UIContext'
import DealCard from '@/components/cards/DealCard'

export default function HomePage() {
  const { openDealModal } = useUI()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Tactical Filter State
  const [sortBy, setSortBy] = useState('profit-desc')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [companyFilter, setCompanyFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics/dashboard')
        const data = await res.json()
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  // Derived Tactical Stream
  const filteredActivity = useMemo(() => {
    if (!analytics) return []
    
    // Combine Recent Activity and Top Deals for a unified stream
    let result = [...analytics.recentActivity]
    
    // Add top deals if they aren't already in activity (crude dedupe by name for UI)
    const activityNames = new Set(result.map(a => a.name))
    analytics.topDeals.forEach((d: any) => {
      if (!activityNames.has(d.name)) result.push(d)
    })

    // Filter
    if (tierFilter !== 'ALL') {
      result = result.filter(d => d.tier === tierFilter)
    }
    if (companyFilter !== 'ALL') {
      result = result.filter(d => d.grading_company === companyFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d => d.name?.toLowerCase().includes(q) || d.token_mint?.toLowerCase().includes(q))
    }

    // Sort
    const [field, dir] = sortBy.split('-')
    result.sort((a, b) => {
      let valA: number, valB: number
      if (field === 'profit') {
        valA = a.alt_value ? (0.85 * a.alt_value) - (a.listing_price_usd || a.price || 0) : -99999
        valB = b.alt_value ? (0.85 * b.alt_value) - (b.listing_price_usd || b.price || 0) : -99999
      } else if (field === 'discount') {
        valA = a.alt_value ? ((a.alt_value - (a.listing_price_usd || a.price || 0)) / a.alt_value) : 0
        valB = b.alt_value ? ((b.alt_value - (b.listing_price_usd || b.price || 0)) / b.alt_value) : 0
      } else {
        valA = a.ts || Date.now()
        valB = b.ts || Date.now()
      }
      return dir === 'desc' ? valB - valA : valA - valB
    })

    return result.slice(0, 20)
  }, [analytics, tierFilter, companyFilter, searchQuery, sortBy])

  if (loading || !analytics) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-accent-gold font-mono text-xs uppercase tracking-[0.3em] animate-pulse">
        <Terminal className="w-8 h-8 mb-4 border border-accent-gold/20 p-1.5 rounded" />
        Initializing Operator Terminal...
      </div>
    )
  }

  const maxVelocity = Math.max(...analytics.scanVelocity, 1)

  return (
    <div className="space-y-4 page-transition font-mono">
      {/* Top Status Bar - Industrial */}
      <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 px-4 rounded group hover:border-accent-gold/20 transition-all">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">System: Nominal</span>
           </div>
           <div className="flex items-center gap-2 border-l border-white/5 pl-6">
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-gray-500 uppercase">Network: Mainnet-Beta</span>
           </div>
           <div className="flex items-center gap-2 border-l border-white/5 pl-6">
              <Shield className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-gray-500 uppercase">Auth: CCPS-V2.1-PRO</span>
           </div>
        </div>
        <div className="text-[10px] text-gray-600 font-bold tabular-nums">
          {new Date().toISOString()}
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* Left Aspect: High-Density KPIs */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
           <TerminalMetric label="Discovery Pipeline" value={analytics.totalCardsTracked.toLocaleString()} sub="Redis A Index" icon={Box} color="text-blue-400" />
           <TerminalMetric label="Live Opportunities" value={analytics.activeDealsCount.toString()} sub="Threshold: 10%" icon={Croissant} color="text-green-400" href="/deals" />
           <TerminalMetric label="Avg Tier Discount" value={`${analytics.averageDiscount.toFixed(1)}%`} sub="Gold/Silver Avg" icon={TrendingUp} color="text-accent-gold" />
           <TerminalMetric label="Theoretical Profit" value={formatUsd(analytics.totalProfit)} sub="Total Pipeline Yield" icon={Croissant} color="text-purple-400" />
           
           {/* Detailed Velocity Chart as a wide tile */}
           <div className="col-span-2 sm:col-span-4 bg-surface/30 border border-white/5 p-4 rounded-lg relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scan Velocity / Pulse</span>
                 </div>
                 <div className="flex items-center gap-4 text-[9px] font-mono">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> <span className="text-gray-500">Hits</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> <span className="text-gray-500">Tiered</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-accent-gold" /> <span className="text-accent-gold">Gold</span></div>
                 </div>
              </div>
              <div className="flex items-end gap-1.5 h-20">
                {analytics.scanVelocity.map((v: any, i: number) => {
                  const maxVal = Math.max(...analytics.scanVelocity.map((x: any) => x.total || x), 1)
                  const totalH = ( (v.total || v) / maxVal ) * 100
                  const tieredH = ( (v.tiered || 0) / (v.total || v) ) * 100
                  const goldH = ( (v.gold || 0) / (v.total || v) ) * 100
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full relative group/bar" style={{ height: `${Math.max(totalH, 4)}%` }}>
                        {/* Total Hit Bar (Back) */}
                        <div className="absolute inset-0 bg-blue-500/10 border-t border-blue-500/20 group-hover/bar:bg-blue-500/20 transition-all" />
                        
                        {/* Tiered Segment */}
                        {v.tiered > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-blue-400/30 border-t border-blue-400/20" 
                            style={{ height: `${tieredH}%` }}
                          />
                        )}
                        
                        {/* Gold Segment */}
                        {v.gold > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-accent-gold shadow-[0_0_8px_rgba(255,215,0,0.4)]" 
                            style={{ height: `${goldH}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
           </div>
        </div>

        {/* Right Aspect: Signal Breakdown */}
        <div className="col-span-12 lg:col-span-4 bg-surface/30 border border-white/5 rounded-lg p-4">
           <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
              <Terminal className="w-3.5 h-3.5 text-accent-gold" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Signal Distribution</span>
           </div>
            <div className="space-y-4">
              {Object.entries(analytics.dealsByTier as Record<string, number>)
                .filter(([tier]) => tier !== 'NONE' && tier !== 'AUTOBUY')
                // Force GOLD to the top, then sort by count
                .sort(([tierA, countA], [tierB, countB]) => {
                  if (tierA === 'GOLD') return -1
                  if (tierB === 'GOLD') return 1
                  return countB - countA
                })
                .map(([tier, count]) => {
                  const validTotal = Object.entries(analytics.dealsByTier as Record<string, number>)
                    .filter(([t]) => t !== 'NONE' && t !== 'AUTOBUY')
                    .reduce((sum, [, c]) => sum + c, 0)
                  
                  const pct = validTotal > 0 ? (count / validTotal * 100) : 0
                  const isGold = tier === 'GOLD'
                  return (
                    <div key={tier} className="group cursor-default">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className={`font-black uppercase tracking-tighter ${isGold ? 'text-accent-gold' : 'text-gray-400'}`}>
                          [{tier}]
                        </span>
                        <span className="text-gray-500 tabular-nums">{count} Units</span>
                      </div>
                      <div className="w-full h-1 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${isGold ? 'bg-accent-gold shadow-[0_0_10px_#ffd700]' : 'bg-gray-700'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
           <div className="mt-8 pt-4 border-t border-white/5 text-[9px] text-gray-600 italic">
              * Tiers auto-assigned based on Alt value confidence and discount slope.
           </div>
        </div>
      </div>

      {/* Feed Section - Operator Activity */}
      <div className="grid grid-cols-12 gap-4">
         {/* System Status Log (Discord Inspired) */}
         <div className="col-span-12 lg:col-span-5 bg-black/40 border border-white/5 rounded-lg p-4 h-[450px] flex flex-col font-mono text-[10px] shadow-inner">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
               <div className="flex items-center gap-2">
                  <Croissant className="w-3.5 h-3.5 text-accent-gold" />
                  <span className="font-black text-white uppercase tracking-widest">Operator Status Terminal</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-500 uppercase">Active</span>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
               {/* Webhook Handler Status */}
               <div className="p-3 rounded bg-blue-500/5 border border-blue-500/10 space-y-1">
                  <p className="text-blue-400 font-bold">ℹ️ Webhook Handler: <span className="text-white">INFO</span></p>
                  <div className="grid grid-cols-2 gap-y-1 text-gray-400">
                     <p>⏱️ Uptime: <span className="text-gray-300">10.0h (600m)</span></p>
                     <p>📥 Received: <span className="text-gray-300">192</span></p>
                     <p>📋 Listings: <span className="text-gray-300">192</span></p>
                     <p>🎯 Watch Hits: <span className="text-gray-300">192</span></p>
                     <p>💎 Deals Found: <span className="text-green-400 font-bold">4</span></p>
                     <p>📣 Alerts Sent: <span className="text-green-400">4</span></p>
                     <p>🤖 Auto-Buys: <span className="text-gray-500">0</span></p>
                     <p>💰 SOL Price: <span className="text-accent-gold font-bold">$135.50</span></p>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-2">📊 Projected: ~13824/month (1.38% of 1M)</p>
               </div>

               {/* Rechecker Status */}
               <div className="p-3 rounded bg-purple-500/5 border border-purple-500/10 space-y-1">
                  <p className="text-purple-400 font-bold">✅ Rechecker Complete</p>
                  <div className="space-y-0.5 text-gray-400">
                     <p>• Scanned: <span className="text-gray-300">2135</span></p>
                     <p>• Deals Found: <span className="text-gray-300">0</span></p>
                     <p>• Deduped: <span className="text-gray-300">2121 (silent updates)</span></p>
                     <p>• Pruned: <span className="text-red-400/80">2</span></p>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1 italic">Last sync: 15m ago</p>
               </div>
            </div>
         </div>

         {/* Neural Opportunity Stream */}
         <div className="col-span-12 lg:col-span-7 bg-black/20 border border-white/5 rounded-lg p-4 h-[550px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
               <div className="flex items-center gap-2">
                  <Croissant className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Opportunity Stream</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="relative group">
                     <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 group-hover:text-accent-gold transition-colors" />
                     <input 
                       type="text" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Filter signals..." 
                       className="bg-black/40 border border-white/5 rounded-md pl-8 pr-3 py-1 text-[10px] text-white focus:outline-none focus:border-accent-gold/40 w-32 focus:w-48 transition-all"
                     />
                  </div>
                  <Link href="/listings" className="text-[9px] text-accent-gold hover:text-white uppercase font-bold tracking-widest transition-colors flex items-center gap-1">
                    Full Pipeline <ArrowUpRight className="w-3 h-3" />
                  </Link>
               </div>
            </div>

            {/* Dynamic Controller Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
               <select 
                 value={sortBy} 
                 onChange={(e) => setSortBy(e.target.value)}
                 className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-gray-400 font-bold focus:outline-none focus:border-accent-gold/40"
               >
                 <option value="ts-desc">Recent Signals</option>
                 <option value="profit-desc">Max Net Profit</option>
                 <option value="discount-desc">Highest Discount</option>
               </select>

               <select 
                 value={tierFilter} 
                 onChange={(e) => setTierFilter(e.target.value)}
                 className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-gray-400 font-bold focus:outline-none focus:border-accent-gold/40"
               >
                 <option value="ALL">All Tiers</option>
                 <option value="GOLD">Gold Only</option>
                 <option value="SILVER">Silver Only</option>
               </select>

               <select 
                 value={companyFilter} 
                 onChange={(e) => setCompanyFilter(e.target.value)}
                 className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] text-gray-400 font-bold focus:outline-none focus:border-accent-gold/40"
               >
                 <option value="ALL">All Co.</option>
                 <option value="PSA">PSA</option>
                 <option value="BGS">BGS</option>
                 <option value="CGC">CGC</option>
                 <option value="SGC">SGC</option>
               </select>

               {(tierFilter !== 'ALL' || companyFilter !== 'ALL' || searchQuery) && (
                 <button 
                   onClick={() => { setTierFilter('ALL'); setCompanyFilter('ALL'); setSearchQuery(''); setSortBy('ts-desc'); }}
                   className="text-[9px] text-red-400 hover:text-red-300 font-black uppercase tracking-tighter flex items-center gap-1 px-2"
                 >
                   <X className="w-2.5 h-2.5" /> Reset
                 </button>
               )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
               {filteredActivity.length > 0 ? filteredActivity.map((event: any, i: number) => {
                 const isDeal = event.price || event.listing_price_usd
                 return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-black/30 border border-white/[0.02] hover:border-white/10 transition-all group cursor-pointer shadow-md" onClick={() => (event.listing_price_sol > 0 && event.seller) && openDealModal(event)}>
                     <span className="text-[9px] text-gray-700 font-mono tabular-nums outline-none">
                       {new Date(event.ts || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                     </span>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                             isDeal ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                           }`}>
                             {isDeal ? 'DEAL' : 'SCAN'}
                           </span>
                           <span className="text-[11px] text-gray-300 truncate font-bold group-hover:text-white transition-colors">{event.name}</span>
                        </div>
                     </div>
                     <div className="text-right tabular-nums">
                        <div className="text-[10px] font-bold text-white">{formatUsd(event.price || event.listing_price_usd || 0)}</div>
                        <div className="text-[8px] text-gray-600 font-mono">{event.tier} · {event.grading_company}</div>
                     </div>
                  </div>
                 )
               }) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2">
                   <Filter className="w-8 h-8 opacity-20" />
                   <p className="text-[10px] uppercase font-black tracking-widest">No matching signals in pipeline</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  )
}

function TerminalMetric({ label, value, sub, icon: Icon, color, href }: any) {
  const content = (
    <div className={`h-full p-4 bg-surface/30 border border-white/5 rounded-lg group transition-all duration-300 relative overflow-hidden ${href ? 'cursor-pointer hover:border-accent-gold/20' : ''}`}>
       <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
             <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black">{label}</p>
             <p className={`text-xl font-black tabular-nums transition-colors ${color} group-hover:text-white`}>{value}</p>
             <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{sub}</p>
          </div>
          <Icon className={`w-3.5 h-3.5 opacity-20 group-hover:opacity-100 transition-opacity ${color}`} />
       </div>
       <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
