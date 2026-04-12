'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search as SearchIcon, Loader, AlertCircle, ExternalLink, Shield, BarChart3, Star, TrendingDown, SlidersHorizontal, X, ArrowUpDown, Sparkles, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import { formatUsd, getConfidenceColor, truncate } from '@/lib/format'
import Sparkline from '@/components/ui/Sparkline'
import CardDetailPanel from '@/components/panels/CardDetailPanel'
import type { RedisACard } from '@/types'

const GRADE_ORDER = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1']

const SORT_OPTIONS = [
  { value: 'alt_value-desc', label: 'Highest Value' },
  { value: 'alt_value-asc', label: 'Lowest Value' },
  { value: 'confidence-desc', label: 'Highest Confidence' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'grade-desc', label: 'Best Grade' },
]

const COMPANY_OPTIONS = [
  { value: 'ALL', label: 'All Companies' },
  { value: 'PSA', label: 'PSA' },
  { value: 'BGS', label: 'Beckett (BGS)' },
  { value: 'CGC', label: 'CGC' },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RedisACard[]>([])
  const [featuredCards, setFeaturedCards] = useState<RedisACard[]>([])
  const [searchedQuery, setSearchedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true)
  const [selectedCard, setSelectedCard] = useState<RedisACard | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [watchingMints, setWatchingMints] = useState<Set<string>>(new Set())
  const [totalTracked, setTotalTracked] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [gradingCompany, setGradingCompany] = useState('ALL')
  const [sortBy, setSortBy] = useState('alt_value-desc')
  const [showOnlyHighValue, setShowOnlyHighValue] = useState(false)
  const [showOnlyHighConfidence, setShowOnlyHighConfidence] = useState(false)

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.totalCardsTracked) setTotalTracked(d.totalCardsTracked)
      })
      .catch(() => {})

    const loadFeaturedCards = async () => {
      setIsLoadingFeatured(true)
      try {
        const res = await fetch('/api/search?q=a&limit=8')
        if (res.ok) {
          const data = await res.json()
          const sorted = (data.results || [])
            .filter((c: RedisACard) => c.alt_value && c.alt_value > 10)
            .sort((a: RedisACard, b: RedisACard) => (b.alt_value || 0) - (a.alt_value || 0))
            .slice(0, 8)
          setFeaturedCards(sorted)
        }
      } catch (err) {
        console.error('Failed to load featured cards:', err)
      } finally {
        setIsLoadingFeatured(false)
      }
    }
    loadFeaturedCards()
  }, [])

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

  const filteredAndSortedCards = useMemo(() => {
    let cards = hasSearched ? results : featuredCards
    
    const minV = parseFloat(minPrice) || 0
    const maxV = parseFloat(maxPrice) || Infinity
    
    cards = cards.filter(card => {
      const val = card.alt_value || 0
      if (val < minV || val > maxV) return false
      if (gradingCompany !== 'ALL' && !card.grading_company?.toUpperCase().includes(gradingCompany)) return false
      if (showOnlyHighValue && val < 100) return false
      if (showOnlyHighConfidence && (card.alt_confidence || 0) < 80) return false
      return true
    })

    const [sortField, sortDir] = sortBy.split('-')
    cards.sort((a: RedisACard, b: RedisACard) => {
      let valA: number | string, valB: number | string
      
      switch (sortField) {
        case 'alt_value':
          valA = a.alt_value || 0
          valB = b.alt_value || 0
          break
        case 'confidence':
          valA = a.alt_confidence || 0
          valB = b.alt_confidence || 0
          break
        case 'name':
          valA = a.name || ''
          valB = b.name || ''
          break
        case 'grade':
          const gradeA = GRADE_ORDER.indexOf(a.grade?.toString() || '0')
          const gradeB = GRADE_ORDER.indexOf(b.grade?.toString() || '0')
          valA = gradeA === -1 ? 999 : gradeA
          valB = gradeB === -1 ? 999 : gradeB
          break
        default:
          valA = a.alt_value || 0
          valB = b.alt_value || 0
      }
      
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA)
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
    })

    return cards
  }, [results, featuredCards, hasSearched, minPrice, maxPrice, gradingCompany, sortBy, showOnlyHighValue, showOnlyHighConfidence])

  const activeFiltersCount = [
    minPrice,
    maxPrice,
    gradingCompany !== 'ALL',
    showOnlyHighValue,
    showOnlyHighConfidence
  ].filter(Boolean).length

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <SearchIcon className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Card Search</h1>
            <p className="text-sm text-gray-400">
              {totalTracked ? `${totalTracked.toLocaleString()} cards indexed` : 'Search all cards from Redis A'}
              <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 ml-2">
                Live Data
              </span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/30 cursor-pointer hover:bg-white/5"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-surface border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setMinPrice('')
                setMaxPrice('')
                setGradingCompany('ALL')
                setShowOnlyHighValue(false)
                setShowOnlyHighConfidence(false)
              }}
              className="p-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-surface rounded-xl border border-white/10 p-4 flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Price:</span>
            <input type="number" placeholder="Min USD" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/30" />
            <span className="text-gray-600">-</span>
            <input type="number" placeholder="Max USD" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/30" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Company:</span>
            <div className="flex gap-1">
              {COMPANY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGradingCompany(opt.value)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    gradingCompany === opt.value
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-black/30 text-gray-400 border border-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyHighValue(!showOnlyHighValue)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                showOnlyHighValue
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-black/30 text-gray-400 border border-white/5 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              $100+
            </button>
            <button
              onClick={() => setShowOnlyHighConfidence(!showOnlyHighConfidence)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                showOnlyHighConfidence
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-black/30 text-gray-400 border border-white/5 hover:text-white'
              }`}
            >
              <Shield className="w-3 h-3" />
              80%+ Conf
            </button>
          </div>
        </div>
      )}

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

      {/* Results / Featured Cards */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          {hasSearched ? (
            <p className="text-xs text-gray-500">
              <span className="text-purple-400 font-bold">{filteredAndSortedCards.length}</span> results for &ldquo;<span className="text-white">{searchedQuery}</span>&rdquo;
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <p className="text-sm text-gray-300">Featured Cards</p>
              <span className="text-[10px] text-gray-500">(Highest value cards in your collection)</span>
            </div>
          )}
        </div>

        {isLoadingFeatured && !hasSearched ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl border border-white/5 overflow-hidden animate-pulse">
                <div className="w-full aspect-[5/7] bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedCards.length === 0 ? (
          <div className="rounded-xl bg-surface border border-white/5 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No cards found matching your search and filters.</p>
            <p className="text-[10px] text-gray-600 mt-1">Try a different name or clear filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedCards.map((card) => {
              const confColor = getConfidenceColor(card.alt_confidence)
              return (
                <div
                  key={card.token_mint}
                  className="bg-surface rounded-xl border border-white/5 overflow-hidden group cursor-pointer card-hover-lift"
                  onClick={() => setSelectedCard(card)}
                >
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
                    {card.alt_value && card.alt_value > 1000 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-500/80 text-white text-[9px] font-bold">
                        HIGH VALUE
                      </div>
                    )}
                  </div>

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

      {/* Detail Panel */}
      <CardDetailPanel 
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAdd={() => selectedCard && toggleWatchlist(selectedCard.token_mint, { stopPropagation: () => {} } as any)}
        isWatched={selectedCard ? watchingMints.has(selectedCard.token_mint) : false}
      />
    </div>
  )
}
