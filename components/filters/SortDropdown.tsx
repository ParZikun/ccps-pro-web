'use client'

import { ChevronDown } from 'lucide-react'

export interface SortOption {
  label: string
  value: string
}

const defaultOptions: SortOption[] = [
  { label: 'Newest First', value: 'listing_timestamp:desc' },
  { label: 'Oldest First', value: 'listing_timestamp:asc' },
  { label: 'Price: Low → High', value: 'listing_price_usd:asc' },
  { label: 'Price: High → Low', value: 'listing_price_usd:desc' },
  { label: 'Best Deals', value: 'discount:desc' },
]

interface SortDropdownProps {
  value: string
  onChange: (value: string) => void
  options?: SortOption[]
}

export default function SortDropdown({ value, onChange, options = defaultOptions }: SortDropdownProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-surface border border-white/10 rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-300 font-medium focus:outline-none focus:border-accent-gold/30 cursor-pointer hover:border-white/20 transition-colors"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#13111a]">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
    </div>
  )
}
