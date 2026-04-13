'use client'

import { useRef, useEffect } from 'react'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'
import type { IChartApi } from 'lightweight-charts'

interface PriceChartProps {
  salesData: Array<{ date: string; price: number }>
  altHistory?: Array<{ date: string; price: number }>
  cartelHistory?: Array<{ date: string; price: number }>
  cartelAvg?: number
  currentPrice?: number
  currentAltPrice?: number
  manualBid?: number
  color?: string
}

export default function PriceChart({ 
  salesData, 
  altHistory, 
  cartelHistory, 
  cartelAvg, 
  currentPrice, 
  currentAltPrice, 
  manualBid, 
  color = '#3b82f6' 
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const handleResize = () => {
      chartRef.current?.applyOptions({ 
        width: chartContainerRef.current?.clientWidth,
        height: 280 
      })
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 280,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        autoScale: true,
        visible: true,
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 215, 0, 0.2)',
          width: 0.5,
          style: 2,
        },
        horzLine: {
          color: 'rgba(255, 215, 0, 0.2)',
          width: 0.5,
          style: 2,
        },
      },
      handleScroll: true,
      handleScale: true,
    })

    const processData = (raw: any[]) => {
      if (!raw || !Array.isArray(raw)) return []
      
      const valid = raw.filter(item => item.date && item.price !== undefined)
      const sorted = [...valid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const uniqueMap = new Map<number, number>()
      sorted.forEach(item => {
        const time = Math.floor(new Date(item.date).getTime() / 1000)
        uniqueMap.set(time, item.price)
      })

      return Array.from(uniqueMap.entries())
        .map(([time, value]) => ({ time: time as any, value }))
        .sort((a, b) => (a.time as number) - (b.time as number))
    }

    // 1. Base Series: Sale History (White Dots/Line)
    const salesSeries = chart.addSeries(LineSeries, {
      color: '#ffffff',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
      lastValueVisible: false,
    })
    const sData = processData(salesData)
    if (sData.length > 0) salesSeries.setData(sData)

    // 2. Alt Valuation: Horizontal Blue Line (Target Reference)
    if (currentAltPrice && currentAltPrice > 0) {
      salesSeries.createPriceLine({
        price: currentAltPrice,
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 0, // Solid line
        axisLabelVisible: false,
        title: '',
      })
    }

    // 3. Cartel Trend History (Yellow Line)
    const cartelSeries = chart.addSeries(LineSeries, {
      color: '#fbbf24',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      lastValueVisible: false,
    })
    if (cartelHistory && cartelHistory.length > 0) {
      const cHistory = processData(cartelHistory)
      if (cHistory.length > 0) cartelSeries.setData(cHistory)
    }

    // Reference Line: Current Listing Price (Solid Red)
    if (currentPrice && currentPrice > 0) {
      salesSeries.createPriceLine({
        price: currentPrice,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: false,
      })
    }

    // Reference Line: Manual Bid Override (Solid Purple)
    if (manualBid) {
      salesSeries.createPriceLine({
        price: manualBid,
        color: '#a855f7',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: false,
      })
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [salesData, altHistory, cartelHistory, cartelAvg, currentPrice, currentAltPrice, manualBid, color])

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="absolute top-2 left-4 z-10 flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-tighter bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white" /> 
          <span className="text-white opacity-80">Sale History</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> 
          <span className="text-blue-400">Alt Valuation: ${currentAltPrice?.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> 
          <span className="text-yellow-500">Cartel Trend: ${cartelAvg?.toFixed(2)}</span>
        </div>
        {currentPrice && currentPrice > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> 
            <span className="text-red-400">Listed: ${currentPrice.toFixed(2)}</span>
          </div>
        )}
        {manualBid && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> 
            <span className="text-purple-400">Safe Limit: ${manualBid.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="w-full mt-6" />
      {(!salesData || salesData.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-lg border border-white/5">
          <p className="text-xs text-gray-500 font-mono italic">No price history available</p>
        </div>
      )}
    </div>
  )
}
