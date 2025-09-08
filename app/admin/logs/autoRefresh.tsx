"use client"
import { useEffect } from 'react'

export default function AutoRefresh({ enabled = true, intervalMs = 10000 }: { enabled?: boolean; intervalMs?: number }){
	useEffect(() => {
		if (!enabled) return
		const id = setInterval(() => {
			try { location.reload() } catch {}
		}, Math.max(3000, intervalMs))
		return () => clearInterval(id)
	}, [enabled, intervalMs])
	return null
}


