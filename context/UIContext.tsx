'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Deal, RedisACard } from '@/types'
import { toast } from 'sonner'

interface UIContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  selectedDeal: Deal | RedisACard | null
  openDealModal: (deal: Deal | RedisACard) => void
  closeDealModal: () => void
  // Watchlist State
  watchingMints: Set<string>
  isWatching: (mint: string) => boolean
  toggleWatchlist: (mint: string) => Promise<void>
}

const UIContext = createContext<UIContextType>({
  isSidebarOpen: false,
  toggleSidebar: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
  viewMode: 'grid',
  setViewMode: () => {},
  selectedDeal: null,
  openDealModal: () => {},
  closeDealModal: () => {},
  watchingMints: new Set(),
  isWatching: () => false,
  toggleWatchlist: async () => {},
})

export const useUI = () => useContext(UIContext)

// Hardcoded for now until session/wallet sync
const TEMP_WALLET = 'test-wallet-123'

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDeal, setSelectedDeal] = useState<Deal | RedisACard | null>(null)
  const [watchingMints, setWatchingMints] = useState<Set<string>>(new Set())

  // Load watchlist on mount
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const res = await fetch(`/api/watchlist/${TEMP_WALLET}`)
        if (res.ok) {
          const data = await res.json()
          const mints = new Set<string>(data.map((item: any) => item.token_mint))
          setWatchingMints(mints)
        }
      } catch (err) {
        console.error('Failed to pre-load watchlist:', err)
      }
    }
    loadWatchlist()
  }, [])

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), [])
  const openSidebar = useCallback(() => setIsSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])

  const openDealModal = useCallback((deal: Deal | RedisACard) => setSelectedDeal(deal), [])
  const closeDealModal = useCallback(() => setSelectedDeal(null), [])

  const isWatching = useCallback((mint: string) => watchingMints.has(mint), [watchingMints])

  const toggleWatchlist = useCallback(async (mint: string) => {
    const isAdding = !watchingMints.has(mint)
    
    // Optimistic Update
    setWatchingMints(prev => {
      const next = new Set(prev)
      if (isAdding) next.add(mint)
      else next.delete(mint)
      return next
    })

    try {
      if (isAdding) {
        toast.info('Adding to watchlist...')
        const res = await fetch(`/api/watchlist/${TEMP_WALLET}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mint })
        })
        if (res.ok) toast.success('Added to watchlist')
        else throw new Error('Failed to add')
      } else {
        const res = await fetch(`/api/watchlist/${TEMP_WALLET}/${mint}`, {
          method: 'DELETE'
        })
        if (res.ok) toast.success('Removed from watchlist')
        else throw new Error('Failed to remove')
      }
    } catch (err) {
      console.error(err)
      toast.error('Watchlist sync failed')
      // Rollback
      setWatchingMints(prev => {
        const next = new Set(prev)
        if (isAdding) next.delete(mint)
        else next.add(mint)
        return next
      })
    }
  }, [watchingMints])

  return (
    <UIContext.Provider value={{ 
      isSidebarOpen, 
      toggleSidebar, 
      openSidebar, 
      closeSidebar,
      viewMode,
      setViewMode,
      selectedDeal,
      openDealModal,
      closeDealModal,
      watchingMints,
      isWatching,
      toggleWatchlist
    }}>
      {children}
    </UIContext.Provider>
  )
}
