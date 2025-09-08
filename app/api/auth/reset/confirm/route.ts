import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeResetTokenAndSetPassword, verifyResetToken } from '@/lib/reset'
import { recordLog } from '@/lib/logs'

export async function POST(req: NextRequest){
	const body = await req.json().catch(()=>({}))
	const schema = z.object({ token: z.string().min(16), password: z.string().min(6) })
	const parsed = schema.safeParse(body)
	if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })
	const { token, password } = parsed.data
	const info = await verifyResetToken(token)
	if (!info){
		try { await recordLog({ level: 'WARN', event: 'RESET_CONFIRM_FAIL', message: 'invalid-token' }) } catch {}
		return NextResponse.json({ ok: false })
	}
	const ok = await consumeResetTokenAndSetPassword(token, password)
	if (ok){
		try { await recordLog({ level: 'INFO', event: 'RESET_CONFIRM', userId: info.userId, message: info.email }) } catch {}
	}
	return NextResponse.json({ ok })
}
