'use client'

import { useState, useEffect } from 'react'
import { Menu, Wifi, WifiOff, Loader } from 'lucide-react'
import { useUI } from '@/context/UIContext'

export default function Navbar() {
  const { toggleSidebar } = useUI()
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'error'>('unknown')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          setHealthStatus('healthy')
        } else {
          setHealthStatus('error')
        }
      } catch {
        setHealthStatus('error')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="fixed top-0 z-50 w-full glass border-b border-accent-gold/10 h-14">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: Hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Visible on mobile only (sidebar shows logo on desktop) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center">
              <span className="text-accent-gold font-bold text-xs">CC</span>
            </div>
            <span className="text-accent-gold font-bold text-sm tracking-wide">CCPS Pro</span>
          </div>
        </div>

        {/* Right: Status + Wallet placeholder */}
        <div className="flex items-center gap-3">
          {/* Backend Health Indicator */}
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
            <span className="relative flex h-2 w-2">
              {healthStatus === 'healthy' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              )}
              {healthStatus === 'unknown' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${healthStatus === 'healthy' ? 'bg-green-500' :
                  healthStatus === 'unknown' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
            </span>
            <span className="text-[11px] font-medium text-gray-400 hidden sm:block font-mono">
              {healthStatus === 'healthy' ? 'Backend Online' :
                healthStatus === 'unknown' ? 'Connecting...' : 'Offline'}
            </span>
          </div>

          {/* Wallet placeholder — will be replaced with real WalletButton */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-semibold hover:bg-accent-gold/20 transition-colors">
            <div className="w-4 h-4 rounded-full bg-accent-gold/30 border border-accent-gold/50" />
            <span className="hidden sm:block">Connect Wallet</span>
          </button>
        </div>
      </div>
    </header>
  )
}
