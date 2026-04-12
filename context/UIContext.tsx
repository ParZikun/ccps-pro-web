'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Deal } from '@/types'

interface UIContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  selectedDeal: Deal | null
  openDealModal: (deal: Deal) => void
  closeDealModal: () => void
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
})

export const useUI = () => useContext(UIContext)

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), [])
  const openSidebar = useCallback(() => setIsSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])

  const openDealModal = useCallback((deal: Deal) => setSelectedDeal(deal), [])
  const closeDealModal = useCallback(() => setSelectedDeal(null), [])

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
      closeDealModal
    }}>
      {children}
    </UIContext.Provider>
  )
}
