'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface CopyButtonProps {
  text: string
  className?: string
  iconSize?: number
}

export default function CopyButton({ text, className = '', iconSize = 12 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Address copied to clipboard', {
        className: 'font-mono text-[10px] uppercase tracking-wider bg-black border border-white/10 text-white',
        duration: 1500
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all active:scale-90 ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="text-green-500 transition-all animate-in fade-in scale-in duration-300" style={{ width: iconSize, height: iconSize }} />
      ) : (
        <Copy style={{ width: iconSize, height: iconSize }} />
      )}
    </button>
  )
}
