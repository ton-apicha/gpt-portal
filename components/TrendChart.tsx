'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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
    const [days, setDays] = useState<number>(14)
    const [show, setShow] = useState({ total: true, ok: true, error: true, timeout: true, latency: true })

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const res = await fetch(`/api/admin/stats/trends?days=${days}`, { cache: 'no-store' })
                if (!res.ok) return
                const json = await res.json()
                if (!mounted) return
                setData(json?.data || [])
            } catch {}
        })()
        return () => {
            mounted = false
        }
    }, [days])

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

        const totalSeries = chart.addAreaSeries({ priceScaleId: 'left', lineColor: '#60a5fa', topColor: 'rgba(96,165,250,0.3)', bottomColor: 'rgba(96,165,250,0.05)' })
        const okSeries = chart.addLineSeries({ color: '#22c55e', priceScaleId: 'left', lineWidth: 2 })
        const errorSeries = chart.addLineSeries({ color: '#ef4444', priceScaleId: 'left', lineWidth: 2 })
        const timeoutSeries = chart.addLineSeries({ color: '#f59e0b', priceScaleId: 'left', lineWidth: 2 })
        const latencySeries = chart.addLineSeries({ color: '#a78bfa', priceScaleId: 'right', lineWidth: 2 })

        totalSeries.setData(toSeries((p) => p.total))
        okSeries.setData(toSeries((p) => p.ok))
        errorSeries.setData(toSeries((p) => p.error))
        timeoutSeries.setData(toSeries((p) => p.timeout))
        latencySeries.setData(toSeries((p) => p.avgLatency))

        totalSeries.applyOptions({ visible: show.total })
        okSeries.applyOptions({ visible: show.ok })
        errorSeries.applyOptions({ visible: show.error })
        timeoutSeries.applyOptions({ visible: show.timeout })
        latencySeries.applyOptions({ visible: show.latency })

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
    }, [data, show])

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-white/70">
                    <span>Trends</span>
                    <select value={days} onChange={(e)=> setDays(parseInt(e.target.value))} className="rounded border border-white/10 bg-transparent px-2 py-1">
                        <option className="bg-gray-900" value={7}>7 days</option>
                        <option className="bg-gray-900" value={14}>14 days</option>
                        <option className="bg-gray-900" value={30}>30 days</option>
                    </select>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={show.total} onChange={(e)=> setShow(s=>({ ...s, total: e.target.checked }))} /> Total</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={show.ok} onChange={(e)=> setShow(s=>({ ...s, ok: e.target.checked }))} /> OK</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={show.error} onChange={(e)=> setShow(s=>({ ...s, error: e.target.checked }))} /> ERROR</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={show.timeout} onChange={(e)=> setShow(s=>({ ...s, timeout: e.target.checked }))} /> TIMEOUT</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={show.latency} onChange={(e)=> setShow(s=>({ ...s, latency: e.target.checked }))} /> Avg latency</label>
                </div>
            </div>
            <div ref={containerRef} className="w-full rounded border border-white/10" />
        </div>
    )
}


