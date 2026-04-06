'use client'

import { Tier } from '@/types'

interface CategoryFilterProps {
  selected: string
  onChange: (value: string) => void
}

const categories = [
  { label: 'All', value: 'ALL', color: 'text-white', activeBg: 'bg-white/10 border-white/30' },
  { label: '🏆 Gold', value: Tier.GOLD, color: 'text-yellow-400', activeBg: 'bg-yellow-500/10 border-yellow-500/30' },
  { label: '🥈 Silver', value: Tier.SILVER, color: 'text-gray-300', activeBg: 'bg-gray-400/10 border-gray-400/30' },
  { label: '🥉 Bronze', value: Tier.BRONZE, color: 'text-amber-600', activeBg: 'bg-amber-600/10 border-amber-600/30' },
  { label: '⚙️ Iron', value: Tier.IRON, color: 'text-gray-400', activeBg: 'bg-gray-500/10 border-gray-500/30' },
]

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {categories.map((cat) => {
        const isActive = selected === cat.value
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border
              ${isActive
                ? `${cat.activeBg} ${cat.color}`
                : 'bg-transparent border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }
            `}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
