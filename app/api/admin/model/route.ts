import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

const mockInstalled = new Set<string>(['llama3.2-vision'])

export async function GET(req: NextRequest) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id || session.user.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}
	const bypass = process.env.E2E_BYPASS_OLLAMA === '1' || req.headers.get('x-test-bypass') === '1'
	if (bypass) {
		return NextResponse.json({ ok: true, data: { models: Array.from(mockInstalled).map((name) => ({ name })) } })
	}
	try {
		const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
		const json = res.ok ? await res.json() : null
		return NextResponse.json({ ok: res.ok, data: json })
	} catch (e) {
		return NextResponse.json({ ok: false, error: 'unreachable' }, { status: 200 })
	}
}

export async function POST(req: NextRequest) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id || session.user.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}
	const { action, model } = await req.json()
	if (!['pull'].includes(action) || typeof model !== 'string') {
		return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
	}
	const bypass = process.env.E2E_BYPASS_OLLAMA === '1' || req.headers.get('x-test-bypass') === '1'
	if (bypass) {
		mockInstalled.add(model)
		return NextResponse.json({ ok: true })
	}
	const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, { method: 'POST', body: JSON.stringify({ name: model }) })
	return NextResponse.json({ ok: res.ok })
}


