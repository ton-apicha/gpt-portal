"use client"
import { useEffect, useState } from 'react'

export default function SettingsPage(){
	const [theme, setTheme] = useState<'light'|'dark'>(() => (typeof window !== 'undefined' ? ((localStorage.getItem('theme') as any) || 'dark') : 'dark'))
	const [models, setModels] = useState<string[]>([])
	const [model, setModel] = useState<string>(() => (typeof window !== 'undefined' ? (localStorage.getItem('model') || 'llama3.2-vision') : 'llama3.2-vision'))
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function load(){
			setLoading(true); setError(null)
			try{
				const res = await fetch('/api/models')
				if(!res.ok) throw new Error('load-failed')
				const json = await res.json()
				setModels(json.models || [])
			}catch(e:any){ setError('โหลดโมเดลไม่สำเร็จ') }
			finally{ setLoading(false) }
		}
		load()
	}, [])

	useEffect(() => {
		try{
			localStorage.setItem('theme', theme)
			const root = document.documentElement
			if(theme==='dark') root.classList.add('dark')
			else root.classList.remove('dark')
		}catch{}
	}, [theme])

	useEffect(() => { try{ localStorage.setItem('model', model) }catch{} }, [model])

	return (
		<div className="mx-auto max-w-2xl p-6 space-y-6">
			<h1 className="text-lg font-semibold">Settings</h1>
			<section className="space-y-2">
				<h2 className="text-sm font-medium text-white/70">Theme</h2>
				<div className="flex items-center gap-3">
					<button onClick={()=>setTheme('light')} className={`rounded border px-3 py-1 text-xs ${theme==='light'?'bg-white/10':''}`}>Light</button>
					<button onClick={()=>setTheme('dark')} className={`rounded border px-3 py-1 text-xs ${theme==='dark'?'bg-white/10':''}`}>Dark</button>
				</div>
			</section>
			<section className="space-y-2">
				<h2 className="text-sm font-medium text-white/70">Model</h2>
				{loading ? (<div className="text-xs text-white/60">กำลังโหลด...</div>) : error ? (<div className="text-xs text-red-400">{error}</div>) : (
					<select value={model} onChange={e=>setModel(e.target.value)} className="rounded border bg-transparent px-2 py-1 text-sm">
						{models.map(m=> <option key={m} value={m} className="bg-gray-900">{m}</option>)}
					</select>
				)}
			</section>
		</div>
	)
}
