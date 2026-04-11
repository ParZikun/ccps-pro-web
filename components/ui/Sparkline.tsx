import React from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

export default function Sparkline({ data, width = 100, height = 30, color = '#3b82f6', strokeWidth = 1.5 }: SparklineProps) {
  // We need at least 2 points to draw a meaningful line
  if (!data || data.length < 2) {
    return <div className="text-[10px] text-gray-600 font-mono italic text-center min-w-[60px]">N/A</div>
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  
  // Padding to prevent thick strokes from getting clipped off the edge of SVG
  const paddingY = strokeWidth * 2
  const graphInnerHeight = height - paddingY * 2
  const range = max - min || 1 // Avoid division by zero if all values are identical

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = paddingY + graphInnerHeight - ((val - min) / range) * graphInnerHeight
    return `${x},${y}`
  }).join(' ')

  const isTrendUp = data[data.length - 1] >= data[0]
  // Override color implicitly based on positive or negative absolute start/end trend, unless overridden manually
  const finalColor = color !== '#3b82f6' ? color : (isTrendUp ? '#10b981' : '#f43f5e')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible inline-block">
      {/* Create a very subtle gradient or fill effect if needed, but for sparklines transparent is best */}
      <polyline
        fill="none"
        stroke={finalColor}
        strokeWidth={strokeWidth}
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-md"
      />
    </svg>
  )
}
