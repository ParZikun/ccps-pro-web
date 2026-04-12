'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Shield, Save, X, AlertTriangle } from 'lucide-react'
import { formatUsd } from '@/lib/format'
import type { RedisACard } from '@/types'
import { toast } from 'sonner'

interface BidConfigProps {
  card: RedisACard
  onClose: () => void
}

interface ManualBid {
  mint: string
  manual_bid_value: number
  updated_at: number
}

export default function BidConfig({ card, onClose }: BidConfigProps) {
  const [bidValue, setBidValue] = useState<string>('')
  const [currentBid, setCurrentBid] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBid = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/config/bids')
        if (res.ok) {
          const data = await res.json()
          const bid = data.bids?.find((b: ManualBid) => b.mint === card.token_mint)
          if (bid) {
            setCurrentBid(bid.manual_bid_value)
            setBidValue(bid.manual_bid_value.toString())
          }
        }
      } catch (err) {
        console.error('Failed to load bid:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBid()
  }, [card.token_mint])

  const handleSave = async () => {
    const value = bidValue ? parseFloat(bidValue) : null
    
    setSaving(true)
    try {
      const res = await fetch(`/api/config/bids/${card.token_mint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_bid_value: value })
      })
      
      if (res.ok) {
        setCurrentBid(value)
        toast.success(value ? `Bid set to ${formatUsd(value)}` : 'Bid config cleared')
        onClose()
      } else {
        toast.error('Failed to save bid config')
      }
    } catch (err) {
      toast.error('Failed to save bid config')
    } finally {
      setSaving(false)
    }
  }

  const profitAtBid = bidValue ? (0.85 * parseFloat(bidValue) - (card.alt_value || 0)) : null
  const profitAtAlt = card.alt_value ? (0.85 * card.alt_value - (card.alt_value || 0)) : null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[80]">
        <div className="bg-surface rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bid Configuration</h2>
                <p className="text-xs text-gray-500">Override ALT value for this card</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Card Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
              <img 
                src={card.img_url || 'https://placehold.co/60x84/13111a/333?text=?'}
                alt={card.name}
                className="w-12 h-16 object-cover rounded"
              />
              <div>
                <p className="text-sm font-bold text-white truncate max-w-[200px]">{card.name}</p>
                <p className="text-xs text-gray-500">{card.grading_company} · {card.grade}</p>
              </div>
            </div>

            {/* ALT Value Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">ALT Value</p>
                <p className="text-lg font-bold text-accent-gold font-mono">{formatUsd(card.alt_value)}</p>
                <p className="text-[10px] text-gray-500">{card.alt_confidence?.toFixed(0)}% confidence</p>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Your Bid</p>
                <p className="text-lg font-bold text-purple-400 font-mono">
                  {currentBid ? formatUsd(currentBid) : 'Not set'}
                </p>
                <p className="text-[10px] text-gray-500">Overrides ALT</p>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Set Manual Bid Value (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={bidValue}
                  onChange={(e) => setBidValue(e.target.value)}
                  placeholder="Enter USD value..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white text-lg font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500/30"
                />
              </div>
              <p className="text-[10px] text-gray-500">
                Leave empty to use ALT value. Cards will be tiered based on this value instead.
              </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-200">
                <p className="font-semibold">Manual bids override ALT values</p>
                <p className="text-yellow-200/70 mt-0.5">
                  If ALT value changes significantly, you may miss or overpay on deals. Consider setting alerts for value drops.
                </p>
              </div>
            </div>

            {/* Profit Preview */}
            {bidValue && parseFloat(bidValue) > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Estimated Profit (at 85%)</p>
                <p className={`text-lg font-bold font-mono ${profitAtBid !== null && profitAtBid > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatUsd(Math.abs(profitAtBid || 0))}
                  {profitAtBid !== null && profitAtBid < 0 && <span className="text-xs text-red-400/70 ml-2">(loss)</span>}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-white/10 bg-black/20">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
