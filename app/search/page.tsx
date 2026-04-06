'use client'

import { useState } from 'react'
import { Search as SearchIcon, Loader, AlertCircle, ExternalLink, Shield, BarChart3, Star, TrendingDown } from 'lucide-react'
import Image from 'next/image'
import { formatUsd, getConfidenceColor, truncate } from '@/lib/format'
import type { RedisACard } from '@/types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RedisACard[]>([])
  const [searchedQuery, setSearchedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCard, setSelectedCard] = useState<RedisACard | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [watchingMints, setWatchingMints] = useState<Set<string>>(new Set())

  const toggleWatchlist = async (mint: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(watchingMints)
    const isCurrentlyWatching = newSet.has(mint)
    
    if (isCurrentlyWatching) newSet.delete(mint)
    else newSet.add(mint)
    setWatchingMints(newSet)

    try {
      if (!isCurrentlyWatching) {
        await fetch(`/api/watchlist/test-wallet-123`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mint })
        })
      } else {
        await fetch(`/api/watchlist/test-wallet-123/${mint}`, { method: 'DELETE' })
      }
    } catch {}
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query || query.length < 3) return

    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results || [])
      setSearchedQuery(query)
      setHasSearched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <SearchIcon className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Card Search</h1>
          <p className="text-sm text-gray-400">
            Search all cards securely from Redis A
            <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-3">
              Live Data
            </span>
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative group">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, mint address, or grading ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-28 py-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/30 focus:shadow-[0_0_20px_-5px_rgba(168,85,247,0.2)] transition-all"
          />
          <button
            type="submit"
            disabled={isSearching || query.length < 3}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSearching ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <SearchIcon className="w-3.5 h-3.5" />}
            Search
          </button>
        </div>
        {query.length > 0 && query.length < 3 && (
          <p className="text-[10px] text-gray-500 mt-1 ml-1">Type at least 3 characters to search</p>
        )}
      </form>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Found <span className="text-purple-400 font-bold">{results.length}</span> results for &ldquo;<span className="text-white">{searchedQuery}</span>&rdquo;
          </p>

          {results.length === 0 ? (
            <div className="rounded-xl bg-surface border border-white/5 p-12 text-center">
              <AlertCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No cards found matching your search.</p>
              <p className="text-[10px] text-gray-600 mt-1">Try a different name, mint, or grading ID</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((card) => {
                const confColor = getConfidenceColor(card.alt_confidence)
                return (
                  <div
                    key={card.token_mint}
                    className="bg-surface rounded-xl border border-white/5 overflow-hidden group cursor-pointer card-hover-lift"
                    onClick={() => setSelectedCard(card)}
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[5/7] bg-black/30 overflow-hidden">
                      <button
                        onClick={(e) => toggleWatchlist(card.token_mint, e)}
                        className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 transition-colors backdrop-blur-sm"
                      >
                        <Star className={`w-3.5 h-3.5 ${watchingMints.has(card.token_mint) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 hover:text-white'}`} />
                      </button>
                      <Image
                        src={card.img_url || 'https://placehold.co/400x560/13111a/333?text=No+Image'}
                        alt={card.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13111a] to-transparent pointer-events-none" />
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <div>
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-400 transition-colors">{card.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono">{card.grading_company} · {card.grade}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">Alt Value</p>
                          <p className="text-accent-gold font-bold font-mono">{formatUsd(card.alt_value)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">Confidence</p>
                          <p className={`font-bold font-mono ${confColor.text}`}>
                            {card.alt_confidence?.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-white/5">
                        <span>Supply: {card.supply}</span>
                        <span>Insured: {formatUsd(card.insured_value)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Hints when no search yet */}
      {!hasSearched && (
        <div className="space-y-4">
          <div className="rounded-xl bg-surface border border-white/5 p-8 text-center">
            <SearchIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Search for any Collector Crypt card</p>
            <p className="text-gray-600 text-xs mt-1">Try: &ldquo;Charizard&rdquo;, &ldquo;Pikachu&rdquo;, &ldquo;Mewtwo&rdquo;, &ldquo;Umbreon&rdquo;</p>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setSelectedCard(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-[80] glass border-l border-purple-500/10 overflow-y-auto animate-slideInRight custom-scrollbar">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedCard.name}</h2>
                  <p className="text-xs text-gray-500 font-mono">{selectedCard.grading_company} · {selectedCard.grade} · #{selectedCard.grading_id}</p>
                </div>
                <button onClick={() => setSelectedCard(null)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                  <span className="text-lg">✕</span>
                </button>
              </div>

              <div className="rounded-xl overflow-hidden bg-black/30 border border-white/5">
                <Image src={selectedCard.img_url || 'https://placehold.co/400x560/13111a/333'} alt={selectedCard.name} width={400} height={560} className="w-full object-contain" />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Alt Value</p>
                  <p className="text-xl font-bold text-accent-gold font-mono">{formatUsd(selectedCard.alt_value)}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Insured</p>
                  <p className="text-xl font-bold text-white font-mono">{formatUsd(selectedCard.insured_value)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Confidence', value: `${selectedCard.alt_confidence?.toFixed(1)}%`, icon: BarChart3 },
                  { label: 'Range', value: `${formatUsd(selectedCard.alt_lower_bound)} — ${formatUsd(selectedCard.alt_upper_bound)}`, icon: TrendingDown },
                  { label: 'Supply', value: selectedCard.supply.toString(), icon: Shield },
                  { label: 'Cartel Avg', value: formatUsd(selectedCard.cartel_avg), icon: BarChart3 },
                  { label: 'Max Buy Price', value: formatUsd(selectedCard.max_buy_price), icon: Star },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/10 border border-white/[0.03]">
                    <span className="flex items-center gap-2 text-xs text-gray-400"><row.icon className="w-3.5 h-3.5" />{row.label}</span>
                    <span className="text-xs font-mono text-white">{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedCard.recent_sales && selectedCard.recent_sales.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Recent Sales</p>
                  <div className="space-y-1">
                    {selectedCard.recent_sales.map((sale, i) => (
                      <div key={i} className="flex justify-between py-1.5 px-3 rounded bg-black/10 border border-white/[0.03] text-xs">
                        <span className="text-gray-500 font-mono">{sale.date}</span>
                        <span className="text-white font-mono">{formatUsd(sale.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <a href={`https://magiceden.io/item-details/${selectedCard.token_mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Magic Eden
                </a>
                <a href={`https://solscan.io/token/${selectedCard.token_mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Solscan
                </a>
              </div>

              <p className="text-[10px] text-gray-600 font-mono text-center">Mint: {truncate(selectedCard.token_mint, 10, 6)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
