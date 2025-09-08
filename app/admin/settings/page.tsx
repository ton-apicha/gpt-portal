"use client"
import { useEffect, useState, FormEvent } from 'react'

export default function AdminSettingsPage(){
	const [form, setForm] = useState({ model: '', maxTokens: '', timeoutMs: '', temperature: '', top_p: '' })
	const [msg, setMsg] = useState<string>('')
	const [loading, setLoading] = useState(true)

	useEffect(()=>{ (async ()=>{
		try{
			const res = await fetch('/api/admin/settings')
			const data = await res.json()
			setForm({ model: data.model, maxTokens: data.maxTokens, timeoutMs: data.timeoutMs, temperature: data.temperature, top_p: data.top_p })
		} finally { setLoading(false) }
	})() }, [])

	async function onSubmit(e: FormEvent){
		e.preventDefault()
		setMsg('')
		const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
		const ok = res.ok
		setMsg(ok ? 'บันทึกแล้ว' : 'บันทึกไม่สำเร็จ')
	}

	function set<K extends keyof typeof form>(k: K, v: string){ setForm((p)=> ({ ...p, [k]: v })) }

	return (
		<div className="p-6">
			<h1 className="text-lg font-semibold mb-4">Admin Settings</h1>
			{loading ? (
				<div>กำลังโหลด...</div>
			) : (
				<form onSubmit={onSubmit} className="grid gap-3 max-w-xl">
					<label className="grid gap-1">
						<span className="text-xs text-white/60">Model</span>
						<input className="rounded border border-white/10 bg-transparent px-2 py-1" value={form.model} onChange={e=>set('model', e.target.value)} />
					</label>
					<label className="grid gap-1">
						<span className="text-xs text-white/60">maxTokens</span>
						<input className="rounded border border-white/10 bg-transparent px-2 py-1" value={form.maxTokens} onChange={e=>set('maxTokens', e.target.value)} />
					</label>
					<label className="grid gap-1">
						<span className="text-xs text-white/60">timeoutMs</span>
						<input className="rounded border border-white/10 bg-transparent px-2 py-1" value={form.timeoutMs} onChange={e=>set('timeoutMs', e.target.value)} />
					</label>
					<label className="grid gap-1">
						<span className="text-xs text-white/60">temperature</span>
						<input className="rounded border border-white/10 bg-transparent px-2 py-1" value={form.temperature} onChange={e=>set('temperature', e.target.value)} />
					</label>
					<label className="grid gap-1">
						<span className="text-xs text-white/60">top_p</span>
						<input className="rounded border border-white/10 bg-transparent px-2 py-1" value={form.top_p} onChange={e=>set('top_p', e.target.value)} />
					</label>
					<button className="rounded bg-blue-600 px-3 py-1 text-sm">บันทึก</button>
					{msg && <div className="text-xs text-white/70">{msg}</div>}
				</form>
			)}
		</div>
	)
}
