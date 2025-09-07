"use client"
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage(){
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()

	async function onSubmit(e: FormEvent){
		e.preventDefault()
		setError(null)
		const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) })
		if (res.ok) router.replace('/login')
		else setError('สมัครสมาชิกไม่สำเร็จ')
	}
	return (
		<div style={{ maxWidth: 360, margin: '80px auto' }}>
			<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>สมัครสมาชิก</h1>
			<form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
				<input placeholder="ชื่อ" value={name} onChange={e=>setName(e.target.value)} />
				<input placeholder="อีเมล" value={email} onChange={e=>setEmail(e.target.value)} />
				<input placeholder="รหัสผ่าน (6 ตัวอักษรขึ้นไป)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
				{error && <div style={{ color: 'crimson' }}>{error}</div>}
				<button type="submit">สมัครสมาชิก</button>
			</form>
		</div>
	)
}
