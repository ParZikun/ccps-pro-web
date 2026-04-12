'use client'

import { useState, useEffect, useMemo } from 'react'
import { Ghost, Loader, AlertCircle, ExternalLink, Search, RefreshCw, Box, Shield, Info, Filter, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import { formatUsd, truncate } from '@/lib/format'
import { useUI } from '@/context/UIContext'
import type { RedisACard } from '@/types'

export default function OrphansPage() {
  const { openDealModal } = useUI()
  const [orphans, setOrphans] = useState<RedisACard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOrphans = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/orphans?limit=200')
      if (res.ok) {
        const data = await res.json()
        setOrphans(data.results || [])
      }
    } catch (err) {
      console.error('Failed to fetch orphans:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrphans()
  }, [])

  const filteredOrphans = useMemo(() => {
    if (!searchTerm) return orphans
    const q = searchTerm.toLowerCase()
    return orphans.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.grading_id?.includes(q) || 
      c.token_mint?.includes(q)
    )
  }, [orphans, searchTerm])

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gray-500/10 border border-gray-500/20">
            <Ghost className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Orphan Terminal</h1>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              Assets missing Alt market research
              <span className="text-[10px] text-yellow-500 font-mono bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                Manual Appraisal Required
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchOrphans}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden flex flex-col">
          {/* Internal Controls */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input 
                    type="text" 
                    placeholder="Search by name or cert..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:placeholder-gray-500"
                  />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-500 font-bold uppercase">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Unpriced</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Insured Only</div>
              </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Asset Details</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Grading</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Insured Value</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {isLoading ? (
                          [...Array(5)].map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                  <td className="px-6 py-4"><div className="h-10 w-48 bg-white/5 rounded" /></td>
                                  <td className="px-6 py-4"><div className="h-6 w-24 bg-white/5 rounded mx-auto" /></td>
                                  <td className="px-6 py-4"><div className="h-6 w-20 bg-white/5 rounded" /></td>
                                  <td className="px-6 py-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                                  <td className="px-6 py-4"><div className="h-8 w-8 bg-white/5 rounded ml-auto" /></td>
                              </tr>
                          ))
                      ) : filteredOrphans.length === 0 ? (
                          <tr>
                              <td colSpan={5} className="px-6 py-20 text-center">
                                  <Ghost className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                                  <p className="text-gray-500 font-bold italic">No orphan assets found in Redis A.</p>
                                  <p className="text-[10px] text-gray-600 mt-1">Run the mapper cycle to surface new assets missing Alt data.</p>
                              </td>
                          </tr>
                      ) : (
                        filteredOrphans.map(card => (
                            <tr key={card.token_mint} className="group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => openDealModal(card)}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-10 h-14 rounded-lg overflow-hidden border border-white/10 bg-black">
                                            <Image 
                                              src={card.img_url || 'https://placehold.co/100x140/13111a/333?text=NO+IMG'} 
                                              alt={card.name} 
                                              fill 
                                              className="object-cover" 
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-black text-white group-hover:text-gray-200 transition-colors">{card.name}</span>
                                            <span className="text-[10px] text-gray-600 font-mono truncate max-w-[200px]">{card.token_mint}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-center">
                                        <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 font-black mb-1">
                                            {card.grading_company}
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 font-mono">{card.grading_id}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-purple-400 font-mono">{formatUsd(card.insured_value)}</span>
                                        <span className="text-[9px] text-gray-600 font-black uppercase">Initial Coverage</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Alt Data Missing</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">Neural Pulse N/A</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                          title="View Inspect Terminal"
                                          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                      )}
                  </tbody>
              </table>
          </div>

          <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] text-gray-600 font-black uppercase tracking-widest">
              <span>Operator Status: Standard Appraisal Mode</span>
              <span>Loaded {filteredOrphans.length} Assets from Redis A</span>
          </div>
      </div>
    </div>
  )
}
