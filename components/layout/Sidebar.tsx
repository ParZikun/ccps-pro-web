'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LayoutDashboard, Croissant, List, Star, Search, Settings, Target, Wallet, Ghost } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import Image from 'next/image'

const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard, description: 'Analytics Dashboard' },
  { name: 'Active Deals', href: '/deals', icon: Croissant, description: 'Hot opportunities' },
  { name: 'All Listings', href: '/listings', icon: List, description: 'Pipeline view' },
  { name: 'Watchlist', href: '/watchlist', icon: Star, description: 'Tracked cards' },
  { name: 'Holdings', href: '/holdings', icon: Wallet, description: 'Portfolio status' },
  { name: 'Card Search', href: '/search', icon: Search, description: 'Browse Redis A' },
  { name: 'Orphan Terminal', href: '/orphans', icon: Ghost, description: 'No Alt market data' },
  { name: 'Competitor Snipes', href: '/competitors', icon: Target, description: 'Tracked wallets' },
]

const bottomNav = [
  { name: 'Operator Suite', href: '/config', icon: Settings, description: 'Global System Sync' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isSidebarOpen, closeSidebar } = useUI()

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[60] w-64 glass border-r border-accent-gold/20
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-accent-gold/20 rounded-xl blur-lg group-hover:bg-accent-gold/30 transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative bg-black rounded-xl border border-white/10 p-1.5 shadow-2xl">
                <Image src="/logo.png" alt="Cartel Logo" width={32} height={32} className="rounded-lg" priority />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tighter">CCPS<span className="text-accent-gold">PRO</span></h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em] font-black">Operator</p>
              </div>
            </div>
          </Link>

          {/* Mobile Close */}
          <button onClick={closeSidebar} className="p-2 text-gray-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/5 mb-2" />

        {/* Main Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3 pt-3 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Navigation</p>
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20 shadow-[0_0_15px_-5px_rgba(255,215,0,0.2)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }
                `}
              >
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent-gold' : 'text-gray-500 group-hover:text-gray-300'}`}
                />
                <div className="flex-1 min-w-0">
                  <span className="block">{item.name}</span>
                  {!isActive && (
                    <span className="block text-[10px] text-gray-600 group-hover:text-gray-500 truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Nav */}
        <div className="px-3 pb-4 space-y-1 border-t border-white/5 pt-3">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }
                `}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}

          {/* Version */}
          <div className="px-3 pt-2">
            <p className="text-[10px] text-gray-600 font-mono">v0.1.0 · Phase 1</p>
          </div>
        </div>
      </div>
    </>
  )
}
