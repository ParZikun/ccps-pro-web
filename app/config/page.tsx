'use client'

import React, { useState, useEffect } from 'react'
import { Save, RefreshCw, Bell, Shield, Wallet, Zap, Settings, Target, Info, AlertTriangle, Croissant } from 'lucide-react'
import { toast } from 'sonner'
import CopyButton from '@/components/ui/CopyButton'

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null)
  const [bids, setBids] = useState<any[]>([])
  const [newBid, setNewBid] = useState({ mint: '', value: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const fetchConfig = async () => {
    setIsFetching(true)
    try {
      const res = await fetch('/api/config/global')
      const bidsRes = await fetch('/api/config/bids')
      
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }

      if (bidsRes.ok) {
        const bidsData = await bidsRes.json()
        setBids(bidsData.bids || [])
      }
    } catch (e: any) {
      toast.error('Failed to sync with backend config')
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const loadToast = toast.loading('Synchronizing global state...')
    try {
      const res = await fetch('/api/config/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('System State Synchronized', { id: loadToast, description: 'Changes will propagate within 1 minute.' })
    } catch (e: any) {
      toast.error(e.message, { id: loadToast })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddBid = async () => {
    if (!newBid.mint || !newBid.value) return
    const loadToast = toast.loading('Deploying directive...')
    try {
      const res = await fetch(`/api/config/bids/${newBid.mint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_bid_value: parseFloat(newBid.value) })
      })
      if (!res.ok) throw new Error('Deployment failed')
      toast.success('Directive Deployed', { id: loadToast })
      setNewBid({ mint: '', value: '' })
      fetchConfig()
    } catch (e: any) {
      toast.error(e.message, { id: loadToast })
    }
  }

  const handleDeleteBid = async (mint: string) => {
    const loadToast = toast.loading('Pruning directive...')
    try {
      const res = await fetch(`/api/config/bids/${mint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_bid_value: null })
      })
      if (!res.ok) throw new Error('Pruning failed')
      toast.success('Directive Pruned', { id: loadToast })
      fetchConfig()
    } catch (e: any) {
      toast.error(e.message, { id: loadToast })
    }
  }

  if (isFetching || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-accent-gold animate-spin" />
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Awaiting Neural Link...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Operator <span className="text-accent-gold italic">Suite</span></h1>
          <p className="text-gray-500 text-xs font-mono mt-3 flex items-center gap-2 uppercase tracking-widest">
            <Settings className="w-3.5 h-3.5" /> Centralized System Configuration Console
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchConfig} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Sync Local
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-gold hover:bg-accent-gold/90 text-black text-[10px] font-black transition-all shadow-[0_0_20px_rgba(255,215,0,0.15)] uppercase tracking-widest"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Synching...' : 'Commit Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tiers & Webhook Tuning */}
        <div className="lg:col-span-8 space-y-8">
          {/* Market Tiers Configuration */}
          <section className="glass rounded-[24px] border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-gold" /> Intelligence Tier Thresholds
              </h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase italic">Real-Time Market Logic</span>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Tier Rank</th>
                      <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Min Discount %</th>
                      <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Min Confidence %</th>
                      <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Min Net Profit ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(config.tiers).map(([tier, values]: [string, any]) => (
                      <tr key={tier} className="group transition-colors hover:bg-white/[0.02]">
                        <td className="py-4 font-black">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getTierStyle(tier)}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            value={values.discount} 
                            onChange={(e) => setConfig({
                              ...config,
                              tiers: { ...config.tiers, [tier]: { ...values, discount: parseFloat(e.target.value) } }
                            })}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white focus:border-accent-gold outline-none w-24" 
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            value={values.confidence || 0} 
                            onChange={(e) => setConfig({
                              ...config,
                              tiers: { ...config.tiers, [tier]: { ...values, confidence: parseFloat(e.target.value) } }
                            })}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white focus:border-accent-gold outline-none w-24" 
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            value={values.minProfit} 
                            onChange={(e) => setConfig({
                              ...config,
                              tiers: { ...config.tiers, [tier]: { ...values, minProfit: parseFloat(e.target.value) } }
                            })}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white focus:border-accent-gold outline-none w-24" 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Webhook Cooldown & Tuning */}
          <section className="glass rounded-[24px] border border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 bg-white/5">
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-400" /> Webhook Engine Tuning
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigInput 
                label="De-dup Cooldown (Days)" 
                sub="Suppress alerts for previously seen mints"
                value={config.webhook.dedupCooldownDays}
                onChange={(v) => setConfig({ ...config, webhook: { ...config.webhook, dedupCooldownDays: parseFloat(v) } })}
              />
              <ConfigInput 
                label="Price Threshold (%)" 
                sub="Re-alert if price drops further than this %"
                value={config.webhook.priceChangeThreshold * 100}
                onChange={(v) => setConfig({ ...config, webhook: { ...config.webhook, priceChangeThreshold: parseFloat(v) / 100 } })}
              />
            </div>
          </section>
        </div>

        {/* Right: Integrations & Buy Logic */}
        <div className="lg:col-span-4 space-y-8">
          {/* Discord Integrations */}
          <section className="glass rounded-[24px] border border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 bg-white/5">
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" /> Notification Hub
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <ConfigInput 
                label="Discord Role ID" 
                sub="Role for @pings on Gold tiers"
                value={config.discord.roleIdCc}
                onChange={(v) => setConfig({ ...config, discord: { ...config.discord, roleIdCc: v } })}
              />
              <ConfigInput 
                label="Main Webhook URL" 
                sub="Channel for universal alerts"
                value={config.discord.webhookMain}
                type="password"
                onChange={(v) => setConfig({ ...config, discord: { ...config.discord, webhookMain: v } })}
              />
              <ConfigInput 
                label="Alpha Calls Webhook" 
                sub="Channel for Gold/Silver pings"
                value={config.discord.webhookCalls}
                type="password"
                onChange={(v) => setConfig({ ...config, discord: { ...config.discord, webhookCalls: v } })}
              />
            </div>
          </section>

          {/* Buy Economics */}
          <section className="glass rounded-[24px] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="px-6 py-5 border-b border-white/10 bg-white/5">
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-400" /> Sniper Economics
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <ConfigInput 
                label="Priority Fee (MicroLamps)" 
                sub="Total compute unit price (lamports)"
                value={config.buy.priorityFeeMicroLamports}
                onChange={(v) => setConfig({ ...config, buy: { ...config.buy, priorityFeeMicroLamports: parseFloat(v) } })}
              />
              <ConfigInput 
                label="Jito Bundle Tip (SOL)" 
                sub="Tip for private bundle execution"
                value={config.buy.jitoTipSol}
                onChange={(v) => setConfig({ ...config, buy: { ...config.buy, jitoTipSol: parseFloat(v) } })}
              />
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Pay Creator Royalties</p>
                  <p className="text-[8px] text-gray-500 font-bold uppercase">Toggle enforced royalty payments</p>
                </div>
                <button 
                  onClick={() => setConfig({ ...config, buy: { ...config.buy, payRoyalties: !config.buy.payRoyalties } })}
                  className={`w-12 h-6 rounded-full transition-all relative ${config.buy.payRoyalties ? 'bg-green-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.buy.payRoyalties ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Logic Engine Warnings */}
          <div className="p-4 rounded-xl border border-yellow-500/10 bg-yellow-500/5 flex gap-3">
             <AlertTriangle className="w-4 h-4 text-yellow-500/50 flex-shrink-0 mt-0.5" />
             <p className="text-[10px] text-yellow-500/70 font-mono leading-normal italic">
               CAUTION: Modifying these values effects the neural sniper directly. Aggressive fees or loose confidence thresholds may increase execution risk.
             </p>
          </div>
        </div>
      </div>

      {/* Strategic Asset Overrides (Manual Bid Manager) */}
      <section className="glass rounded-[24px] border border-white/10 overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Croissant className="w-4 h-4 text-purple-400" /> Strategic Asset Overrides
          </h2>
          <span className="text-[10px] text-gray-500 font-bold uppercase italic">Active Directives</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* List of active bids */}
            <div className="lg:col-span-8 space-y-4">
               {bids.length === 0 ? (
                 <div className="p-12 text-center rounded-xl bg-black/20 border border-dashed border-white/5">
                    <p className="text-gray-500 text-xs font-mono uppercase font-black">No active overrides deployed</p>
                 </div>
               ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] text-gray-500 uppercase font-black tracking-widest">
                        <th className="pb-3">Mint Address</th>
                        <th className="pb-3 text-right">Override Value</th>
                        <th className="pb-3 text-right">Deployed</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bids.map((bid: any) => (
                        <tr key={bid.mint} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-mono text-[10px] text-gray-400">
                             <span className="flex items-center gap-2">
                               {bid.mint}
                               <CopyButton text={bid.mint} className="opacity-0 group-hover:opacity-100" iconSize={10} />
                             </span>
                          </td>
                          <td className="py-3 text-right text-xs font-black text-purple-400 font-mono">
                            ${bid.manual_bid_value.toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-[10px] text-gray-600 font-mono uppercase">
                             {new Date(bid.updated_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                             <button 
                               onClick={() => handleDeleteBid(bid.mint)}
                               className="text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-all font-black text-[9px] uppercase"
                             >
                               Prune
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
               )}
            </div>

            {/* Quick Add Override */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <RefreshCw className="w-3 h-3 text-blue-400" /> Deploy Manual Directive
               </h3>
               <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Token Mint</label>
                    <input 
                      type="text" 
                      placeholder="Enter Mint Address..." 
                      value={newBid.mint}
                      onChange={(e) => setNewBid({ ...newBid, mint: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono font-bold text-white focus:border-accent-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Max Bid (USD)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newBid.value}
                      onChange={(e) => setNewBid({ ...newBid, value: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono font-bold text-white focus:border-accent-gold outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleAddBid}
                    disabled={!newBid.mint || !newBid.value}
                    className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" /> Commit Override
                  </button>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ConfigInput({ label, sub, value, onChange, type = 'text' }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-[10px] font-black text-white uppercase tracking-wider">{label}</label>
      </div>
      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tight">{sub}</p>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white focus:border-accent-gold outline-none transition-colors"
      />
    </div>
  )
}

function getTierStyle(tier: string) {
  switch (tier.toUpperCase()) {
    case 'GOLD': return 'bg-accent-gold/10 text-accent-gold border-accent-gold/20'
    case 'SILVER': return 'bg-gray-400/10 text-gray-300 border-gray-400/20'
    case 'BRONZE': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'IRON': return 'bg-blue-400/10 text-blue-300 border-blue-400/20'
    default: return 'bg-white/5 text-gray-500 border-white/10'
  }
}
