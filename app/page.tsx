'use client'

import { LayoutDashboard, TrendingUp, Flame, Target, Zap, Clock, ArrowUpRight, Activity } from 'lucide-react'
import { getTierColor, formatUsd, timeAgo } from '@/lib/format'
import { Tier } from '@/types'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const tierIcons: Record<string, string> = {
  [Tier.GOLD]: '🏆',
  [Tier.SILVER]: '🥈',
  [Tier.BRONZE]: '🥉',
  [Tier.IRON]: '⚙️',
  [Tier.SUSPICIOUS]: '⚠️',
  [Tier.NONE]: '—',
  [Tier.AUTOBUY]: '🤖',
}

export default function HomePage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading || !analytics) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500 font-mono text-sm animate-pulse">
        [Loading Analytics from Redis...]
      </div>
    )
  }

  // Calculate max for scan velocity chart
  const maxVelocity = Math.max(...analytics.scanVelocity, 1)

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-gold/10 border border-accent-gold/20">
            <LayoutDashboard className="w-6 h-6 text-accent-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
            <p className="text-sm text-gray-400">Real-time overview of your card sniping pipeline</p>
          </div>
        </div>
        <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
          Live Data
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cards Tracked"
          value={analytics.totalCardsTracked.toLocaleString()}
          sub="Redis A watchlist"
          icon={Target}
          color="border-blue-500/20"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Active Deals"
          value={analytics.activeDealsCount.toString()}
          sub="Redis B opportunities"
          icon={Flame}
          color="border-green-500/20"
          iconColor="text-green-400"
          href="/deals"
        />
        <StatCard
          label="Avg Discount"
          value={`${analytics.averageDiscount.toFixed(1)}%`}
          sub="Across active opps"
          icon={TrendingUp}
          color="border-accent-gold/20"
          iconColor="text-accent-gold"
        />
        <StatCard
          label="Total Est. Profit"
          value={formatUsd(analytics.totalProfit)}
          sub="If all deals closed"
          icon={Zap}
          color="border-purple-500/20"
          iconColor="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tier Distribution */}
        <div className="lg:col-span-1 bg-surface rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent-gold" />
            Deal Breakdown by Tier
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.dealsByTier)
              .filter(([tier]) => tier !== Tier.NONE && tier !== Tier.AUTOBUY)
              .sort(([, a], [, b]) => b - a)
              .map(([tier, count]) => {
                const color = getTierColor(tier)
                const pct = analytics.activeDealsCount > 0 ? (count / analytics.activeDealsCount * 100) : 0
                return (
                  <div key={tier} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${color.text} font-medium`}>
                        {tierIcons[tier]} {tier}
                      </span>
                      <span className="text-gray-400 font-mono">
                        <span className="text-white font-bold">{count}</span> ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          tier === 'GOLD' ? 'bg-yellow-500' :
                          tier === 'SILVER' ? 'bg-gray-400' :
                          tier === 'BRONZE' ? 'bg-amber-600' :
                          tier === 'IRON' ? 'bg-gray-500' :
                          tier === 'SUSPICIOUS' ? 'bg-orange-500' :
                          'bg-white/20'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Scan Velocity Chart */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Scan Velocity
            <span className="text-[10px] text-gray-500 font-normal ml-auto">Last 24 hours</span>
          </h3>
          <div className="flex items-end gap-1 h-32">
            {analytics.scanVelocity.map((count, i) => {
              const height = maxVelocity > 0 ? (count / maxVelocity * 100) : 0
              const hour = (new Date().getHours() - 23 + i + 24) % 24
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className="w-full rounded-t bg-blue-500/30 hover:bg-blue-500/50 transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 px-2 py-1 rounded text-[10px] text-white font-mono whitespace-nowrap z-10 border border-white/10">
                    {hour}:00 — {count} listings
                  </div>
                  {i % 6 === 0 && (
                    <span className="text-[8px] text-gray-600 font-mono mt-1">{hour}h</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span>Total: {analytics.scanVelocity.reduce((a, b) => a + b, 0)} listings</span>
            <span>Avg: {(analytics.scanVelocity.reduce((a, b) => a + b, 0) / 24).toFixed(1)}/hr</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Deals */}
        <div className="bg-surface rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Top Deals
            </h3>
            <Link href="/deals" className="text-[10px] text-accent-gold hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {analytics.topDeals.map((deal, i) => {
              const discount = deal.alt_value ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100) : 0
              const tierColor = getTierColor(deal.tier)
              return (
                <div key={deal.token_mint} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/10 border border-white/[0.03] hover:bg-white/[0.03] transition-colors group">
                  <span className="text-[10px] text-gray-600 font-mono w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate group-hover:text-accent-gold transition-colors">{deal.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{deal.grading_company} · {formatUsd(deal.listing_price_usd)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-accent-gold font-mono">{discount.toFixed(1)}% off</p>
                    <span className={`text-[9px] font-bold ${tierColor.text}`}>{deal.tier}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-400" />
              Recent Activity
            </h3>
            <Link href="/listings" className="text-[10px] text-accent-gold hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {analytics.recentActivity.map((event, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  event.type === 'DEAL' ? 'bg-green-400' :
                  event.type === 'HIT' ? 'bg-blue-400' :
                  event.type === 'SKIP' ? 'bg-gray-500' : 'bg-yellow-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      event.type === 'DEAL' ? 'bg-green-500/10 text-green-400' :
                      event.type === 'SKIP' ? 'bg-gray-500/10 text-gray-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-300 truncate">{event.name}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400 font-mono">{event.price ? formatUsd(event.price) : '—'}</p>
                  <p className="text-[9px] text-gray-600">{timeAgo(event.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable Stat Card ─────────────────────────
interface StatCardProps {
  label: string
  value: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  iconColor: string
  href?: string
}

function StatCard({ label, value, sub, icon: Icon, color, iconColor, href }: StatCardProps) {
  const content = (
    <div className={`p-5 rounded-xl bg-surface border ${color} relative overflow-hidden group hover:bg-surface-elevated transition-colors ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-3xl font-bold text-white font-mono tracking-tight">{value}</p>
      <p className="text-[10px] text-gray-600 font-mono mt-1">{sub}</p>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full" />
      {href && (
        <ArrowUpRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-gray-600 group-hover:text-accent-gold transition-colors" />
      )}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
