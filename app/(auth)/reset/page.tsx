"use client"
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPage(){
	const [email, setEmail] = useState('')
	const [stage, setStage] = useState<'request'|'confirm'>('request')
	const [token, setToken] = useState('')
	const [password, setPassword] = useState('')
	const [message, setMessage] = useState<string | null>(null)
	const router = useRouter()

	async function requestToken(e: FormEvent){
		e.preventDefault()
		setMessage(null)
		const res = await fetch('/api/auth/reset/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
		const data = await res.json()
		if (data?.ok){
			if (data.token) setToken(data.token)
			setStage('confirm')
			setMessage('เราได้สร้างรหัสสำหรับรีเซ็ตให้แล้ว (dev: แสดง token ด้านล่าง)')
		} else {
			setMessage('ไม่สามารถสร้างคำขอรีเซ็ตได้')
		}
	}

	async function confirmReset(e: FormEvent){
		e.preventDefault()
		setMessage(null)
		const res = await fetch('/api/auth/reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
		const data = await res.json()
		if (data?.ok){
			setMessage('ตั้งรหัสผ่านใหม่สำเร็จแล้ว')
			setTimeout(()=> router.replace('/login'), 800)
		} else {
			setMessage('โทเค็นไม่ถูกต้องหรือหมดอายุ')
		}
	}

	return (
		<div style={{ maxWidth: 420, margin: '80px auto' }}>
			<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>ลืมรหัสผ่าน</h1>
			{stage === 'request' ? (
				<form onSubmit={requestToken} style={{ display: 'grid', gap: 8 }}>
					<input placeholder="อีเมล" value={email} onChange={e=>setEmail(e.target.value)} />
					<button type="submit">ขอรหัสรีเซ็ต</button>
				</form>
			) : (
				<form onSubmit={confirmReset} style={{ display: 'grid', gap: 8 }}>
					<input placeholder="โทเค็น" value={token} onChange={e=>setToken(e.target.value)} />
					{token && (
						<small>dev token: {token}</small>
					)}
					<input placeholder="รหัสผ่านใหม่" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
					<button type="submit">ตั้งรหัสผ่านใหม่</button>
				</form>
			)}
			{message && <div style={{ marginTop: 8 }}>{message}</div>}
			<div style={{ marginTop: 16 }}>
				<a href="/login">กลับสู่หน้าเข้าสู่ระบบ</a>
			</div>
		</div>
	)
}
