"use client"
import { useEffect, useState } from 'react'

export default function StatusPage(){
	const [data, setData] = useState<{ ollama: string; latencyMs: number } | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(()=>{
		async function load(){
			try{
				const r = await fetch('/api/health', { cache: 'no-store' })
				const j = await r.json()
				setData(j)
			}catch(e: any){ setError(e?.message ?? 'failed') }
		}
		load()
	},[])

	return (
		<div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
			<h1 style={{ fontSize: 24, fontWeight: 700 }}>System Status</h1>
			{error && <div style={{ color: 'crimson' }}>Error: {error}</div>}
			{data ? (
				<div style={{ marginTop: 12 }}>
					<div>Ollama: <b>{data.ollama}</b></div>
					<div>Latency: <b>{data.latencyMs} ms</b></div>
				</div>
			) : (<div style={{ marginTop: 12 }}>Loading...</div>)}
		</div>
	)
}
