import { NextResponse } from 'next/server'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function GET(){
	const started = Date.now()
	let ok = false
	try{
		const r = await fetch(OLLAMA_BASE_URL, { method: 'GET' })
		ok = r.ok
	}catch{}
	const ms = Date.now() - started
	return NextResponse.json({ ollama: ok ? 'up' : 'down', latencyMs: ms })
}
