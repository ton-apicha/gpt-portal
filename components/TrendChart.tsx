'use client'
import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, Time } from 'lightweight-charts'

type TrendPoint = {
    day: string
    total: number
    ok: number
    error: number
    timeout: number
    tokens: number
    avgLatency: number
}

export default function TrendChart() {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [data, setData] = useState<TrendPoint[] | null>(null)

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const res = await fetch('/api/admin/stats/trends', { cache: 'no-store' })
                if (!res.ok) return
                const json = await res.json()
                if (!mounted) return
                setData(json?.data || [])
            } catch {}
        })()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        if (!containerRef.current || !data || data.length === 0) return
        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 260,
            layout: { background: { type: ColorType.Solid, color: '#0b1020' }, textColor: '#aab2c0' },
            rightPriceScale: { borderVisible: false },
            leftPriceScale: { borderVisible: false, visible: true },
            timeScale: { borderVisible: false },
            grid: { horzLines: { color: '#1f2937' }, vertLines: { color: '#1f2937' } },
        })

        const toSeries = (selector: (p: TrendPoint) => number) =>
            data.map((p) => ({ time: p.day as Time, value: selector(p) }))

        const totalSeries = chart.addAreaSeries({
            priceScaleId: 'left',
            lineColor: '#60a5fa',
            topColor: 'rgba(96,165,250,0.3)',
            bottomColor: 'rgba(96,165,250,0.05)',
        })
        totalSeries.setData(toSeries((p) => p.total))

        const okSeries = chart.addLineSeries({ color: '#22c55e', priceScaleId: 'left', lineWidth: 2 })
        okSeries.setData(toSeries((p) => p.ok))

        const errorSeries = chart.addLineSeries({ color: '#ef4444', priceScaleId: 'left', lineWidth: 2 })
        errorSeries.setData(toSeries((p) => p.error))

        const timeoutSeries = chart.addLineSeries({ color: '#f59e0b', priceScaleId: 'left', lineWidth: 2 })
        timeoutSeries.setData(toSeries((p) => p.timeout))

        const latencySeries = chart.addLineSeries({ color: '#a78bfa', priceScaleId: 'right', lineWidth: 2 })
        latencySeries.setData(toSeries((p) => p.avgLatency))

        chart.timeScale().fitContent()

        const onResize = () => {
            if (!containerRef.current) return
            chart.applyOptions({ width: containerRef.current.clientWidth })
        }
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
            chart.remove()
        }
    }, [data])

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-white/80 text-sm">Trends (14 days)</h2>
                <div className="text-xs text-white/50 space-x-3">
                    <span><span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: '#60a5fa' }} /> Total</span>
                    <span><span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: '#22c55e' }} /> OK</span>
                    <span><span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: '#ef4444' }} /> ERROR</span>
                    <span><span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: '#f59e0b' }} /> TIMEOUT</span>
                    <span><span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: '#a78bfa' }} /> Avg latency</span>
                </div>
            </div>
            <div ref={containerRef} className="w-full rounded border border-white/10" />
        </div>
    )
}


