"use client"
import { useState } from 'react'

export default function RegisterPage(){
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [msg, setMsg] = useState('')
	async function submit(e: any){
		e.preventDefault()
		setMsg('')
		const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) })
		setMsg(res.ok ? 'สำเร็จ' : 'ไม่สำเร็จ')
	}
	return (
		<div style={{ maxWidth: 420, margin: '80px auto' }}>
			<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>สมัครสมาชิก</h1>
			<form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
				<input placeholder="อีเมล" value={email} onChange={e=>setEmail(e.target.value)} />
				<input placeholder="รหัสผ่าน" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
				<input placeholder="ชื่อ" value={name} onChange={e=>setName(e.target.value)} />
				<button type="submit">สมัคร</button>
			</form>
			{msg && <div>{msg}</div>}
		</div>
	)
}
