'use client'

import { Star } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import { cn } from '@/lib/utils'

interface WatchlistStarProps {
  mint: string
  className?: string
  iconSize?: number
}

export default function WatchlistStar({ mint, className, iconSize = 16 }: WatchlistStarProps) {
  const { isWatching, toggleWatchlist } = useUI()
  const active = isWatching(mint)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    toggleWatchlist(mint)
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-full transition-all duration-300 group",
        "bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20",
        active ? "shadow-[0_0_15px_rgba(255,215,0,0.2)]" : "",
        className
      )}
      title={active ? 'Remove from Watchlist' : 'Add to Watchlist'}
    >
      <Star 
        size={iconSize}
        className={cn(
          "transition-all duration-300",
          active 
            ? "text-accent-gold fill-accent-gold scale-110" 
            : "text-gray-500 group-hover:text-white"
        )}
      />
    </button>
  )
}
