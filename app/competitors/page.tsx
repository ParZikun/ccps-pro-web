'use client'

import { useState, useEffect } from 'react'
import { Target, ExternalLink } from 'lucide-react'
import { truncate, timeAgo } from '@/lib/format'
import Image from 'next/image'

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompetitors = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/competitors')
        const data = await res.json()
        setCompetitors(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCompetitors()
  }, [])

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <Target className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Competitor Snipes</h1>
          <p className="text-sm text-gray-400">
            Real-time on-chain actions by tracked competitor wallets
            <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
              Live Data
            </span>
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Asset</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Wallet</th>
                <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Action</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cost</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Time</th>
                <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Links</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs animate-pulse font-mono">
                    [Loading Competitor Activity...]
                  </td>
                </tr>
              ) : competitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">
                    No competitor activity recorded yet.
                  </td>
                </tr>
              ) : (
                competitors.map((comp) => {
                  const isBuy = comp.action === 'BUY'
                  const RowColor = isBuy ? 'text-green-400' : comp.action === 'SELL' ? 'text-orange-400' : 'text-blue-400'
                  
                  return (
                    <tr
                      key={`${comp.wallet}-${comp.signature}`}
                      className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Asset */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-black/30 flex-shrink-0">
                            <Image
                              src={comp.meta?.img_url || 'https://placehold.co/40x40/13111a/333?text=?'}
                              alt=""
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate max-w-[180px]">
                              {comp.meta?.name || 'Unknown Asset'}
                            </p>
                            <p className="text-[10px] text-gray-600 font-mono truncate">
                              {truncate(comp.mint, 8, 8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Wallet */}
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-mono text-gray-300">
                          {truncate(comp.wallet, 6, 4)}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 ${RowColor}`}>
                          {comp.action}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-mono text-white">{comp.priceStr}</p>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-[10px] text-gray-500">{timeAgo(comp.timestamp)}</p>
                      </td>

                      {/* Links */}
                      <td className="px-4 py-3 text-center">
                         <div className="flex justify-center gap-2">
                           <a href={`https://solscan.io/tx/${comp.signature}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-sky-400">
                             <ExternalLink className="w-3.5 h-3.5" />
                           </a>
                         </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
