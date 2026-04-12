'use client'

import { useRef, useEffect } from 'react'
import { createChart, ColorType, AreaSeries, LineSeries } from 'lightweight-charts'
import type { IChartApi } from 'lightweight-charts'

interface PriceChartProps {
  data: Array<{ date: string; price: number }>
  cartelHistory?: Array<{ date: string; price: number }>
  cartelAvg?: number
  currentPrice?: number
  currentAltPrice?: number
  manualBid?: number
  color?: string
}

export default function PriceChart({ data, cartelHistory, cartelAvg, currentPrice, currentAltPrice, manualBid, color = '#3b82f6' }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const handleResize = () => {
      chartRef.current?.applyOptions({ 
        width: chartContainerRef.current?.clientWidth,
        height: 240 
      })
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 10,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
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

    // 1. Primary: Alt Value Area Series
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}00`,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })

    // Sanitize and sort data: Filter out entries with invalid dates to prevent chart breakage
    const validData = data.filter(item => {
      if (!item.date) return false
      const d = new Date(item.date)
      return !isNaN(d.getTime())
    })
    
    const sortedData = [...validData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Deduplicate by timestamp (Keep the latest price if multiple sales on same date/time)
    const uniqueDataMap = new Map<number, number>()
    sortedData.forEach(item => {
      const time = Math.floor(new Date(item.date).getTime() / 1000)
      uniqueDataMap.set(time, item.price)
    })

    const chartData = Array.from(uniqueDataMap.entries()).map(([time, value]) => ({
      time: time as any,
      value
    })).sort((a, b) => (a.time as number) - (b.time as number))

    if (chartData.length > 0) {
      areaSeries.setData(chartData)
    }

    // 1.5 Secondary: Cartel Trend (Yellow Line)
    if (cartelHistory && cartelHistory.length > 0) {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#fbbf24',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
      })
      
      const vHistory = cartelHistory.filter(item => {
        if (!item.date) return false
        const d = new Date(item.date)
        return !isNaN(d.getTime())
      })
      
      const sortedHistory = [...vHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const uniqueHistoryMap = new Map<number, number>()
      sortedHistory.forEach(item => {
        const time = Math.floor(new Date(item.date).getTime() / 1000)
        uniqueHistoryMap.set(time, item.price)
      })
      
      const lineData = Array.from(uniqueHistoryMap.entries()).map(([time, value]) => ({
        time: time as any,
        value
      })).sort((a, b) => (a.time as number) - (b.time as number))
      
      lineSeries.setData(lineData)
    }

    // 2. Cartel Average Baseline
    if (cartelAvg) {
      areaSeries.createPriceLine({
        price: cartelAvg,
        color: '#fbbf24',
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: 'CARTEL AVG',
      })
    }

    // 2.5 Alt Valuation Baseline (Matching blue series)
    if (currentAltPrice) {
      areaSeries.createPriceLine({
        price: currentAltPrice,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: 'ALT RESEARCH',
      })
    }

    // 3. Current Listing Price (Pulsing Red/Green Line)
    if (currentPrice && currentPrice > 0) {
      areaSeries.createPriceLine({
        price: currentPrice,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: 'LISTED PRICE',
      })
    }

    // 4. Manual Bid Override (Purple)
    if (manualBid) {
      areaSeries.createPriceLine({
        price: manualBid,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'SAFE LIMIT',
      })
    }

    chart.timeScale().fitContent()

    chartRef.current = chart
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, cartelHistory, cartelAvg, currentPrice, manualBid, color])

  return (
    <div className="w-full relative group">
      <div className="absolute top-2 left-6 z-10 flex gap-4 text-[9px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> <span className="text-gray-400">Alt Research</span></div>
        {(cartelAvg || cartelHistory) && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> <span className="text-gray-400">Cartel Trend</span></div>}
        {manualBid && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> <span className="text-gray-400">Manual Bid</span></div>}
      </div>
      <div ref={chartContainerRef} className="w-full" />
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-lg border border-white/5">
          <p className="text-xs text-gray-500 font-mono italic">No price history available</p>
        </div>
      )}
    </div>
  )
}
