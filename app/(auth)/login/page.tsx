"use client"
import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage(){
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()
	const sp = useSearchParams()

	async function onSubmit(e: FormEvent){
		e.preventDefault()
		setError(null)
		const res = await signIn('credentials', { email, password, redirect: false })
		if (res?.ok) {
			try { await fetch('/api/admin/logs', { method: 'POST', body: JSON.stringify({ level: 'INFO', event: 'LOGIN_OK' }) }) } catch {}
			const next = sp.get('next') || '/'
			router.replace(next)
		} else {
			try { await fetch('/api/admin/logs', { method: 'POST', body: JSON.stringify({ level: 'WARN', event: 'LOGIN_FAIL', message: email }) }) } catch {}
			setError('เข้าสู่ระบบไม่สำเร็จ')
		}
	}

	return (
		<div style={{ maxWidth: 360, margin: '80px auto' }}>
			<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>เข้าสู่ระบบ</h1>
			<form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
				<input placeholder="อีเมล" value={email} onChange={e=>setEmail(e.target.value)} />
				<input placeholder="รหัสผ่าน" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
				{error && <div style={{ color: 'crimson' }}>{error}</div>}
				<button type="submit">เข้าสู่ระบบ</button>
			</form>
			<div style={{ marginTop: 12 }}>
				<a href="/reset">ลืมรหัสผ่าน?</a>
			</div>
		</div>
	)
}
