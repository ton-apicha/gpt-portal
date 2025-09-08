import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { getAllSettings, setSettings } from '@/lib/settings'

export async function GET(){
	const session = await getSessionOrBypass()
	if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
	const all = await getAllSettings()
	return NextResponse.json(all)
}

export async function PATCH(req: NextRequest){
	const session = await getSessionOrBypass()
	if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
	const body = await req.json().catch(()=>({}))
	await setSettings({
		model: typeof body.model === 'string' ? body.model : undefined,
		maxTokens: typeof body.maxTokens === 'string' ? body.maxTokens : undefined,
		timeoutMs: typeof body.timeoutMs === 'string' ? body.timeoutMs : undefined,
		temperature: typeof body.temperature === 'string' ? body.temperature : undefined,
		top_p: typeof body.top_p === 'string' ? body.top_p : undefined,
	})
	return NextResponse.json({ ok: true })
}
