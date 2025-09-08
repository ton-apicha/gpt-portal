"use client"
import { useEffect, useState, FormEvent } from 'react'

export default function ProfilePage(){
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [role, setRole] = useState('')
	const [password, setPassword] = useState('')
	const [message, setMessage] = useState<string | null>(null)

	useEffect(()=>{
		let mounted = true
		;(async () => {
			try {
				const res = await fetch('/api/profile', { cache: 'no-store' })
				const data = await res.json()
				if (mounted && data?.user){
					setEmail(data.user.email)
					setName(data.user.name || '')
					setRole(data.user.role)
				}
			} catch {}
		})()
		return () => { mounted = false }
	}, [])

	async function onSubmit(e: FormEvent){
		e.preventDefault()
		setMessage(null)
		const payload: any = {}
		if (name) payload.name = name
		if (password) payload.password = password
		const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
		const data = await res.json()
		if (data?.ok) setMessage('บันทึกแล้ว')
		else setMessage('บันทึกไม่สำเร็จ')
	}

	return (
		<div style={{ maxWidth: 480, margin: '60px auto' }}>
			<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>โปรไฟล์</h1>
			<div style={{ marginBottom: 12, color: '#aaa' }}>อีเมล: {email} · บทบาท: {role}</div>
			<form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
				<label>
					ชื่อ
					<input value={name} onChange={e=>setName(e.target.value)} />
				</label>
				<label>
					รหัสผ่านใหม่
					<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="ปล่อยว่างหากไม่เปลี่ยน" />
				</label>
				<button type="submit">บันทึก</button>
			</form>
			{message && <div style={{ marginTop: 8 }}>{message}</div>}
		</div>
	)
}


