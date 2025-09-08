import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createResetTokenForEmail } from '@/lib/reset'
import { isRateLimited, recordAttempt } from '@/lib/security'
import { recordLog } from '@/lib/logs'

export async function POST(req: NextRequest){
	const body = await req.json().catch(()=>({}))
	const schema = z.object({ email: z.string().email() })
	const parsed = schema.safeParse(body)
	if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })
	const { email } = parsed.data
	if (await isRateLimited('RESET', email)) {
		try { await recordLog({ level: 'WARN', event: 'RESET_RATELIMIT', message: email }) } catch {}
		return NextResponse.json({ ok: true })
	}
	const info = await createResetTokenForEmail(email)
	await recordAttempt('REGISTER' as any, email, !!info) // reuse table for accounting only
	try { await recordLog({ level: 'INFO', event: 'RESET_REQUEST', message: email }) } catch {}
	// dev: แทนที่จะส่งอีเมล ให้ตอบ token กลับไปเพื่อทดสอบ
	return NextResponse.json({ ok: true, token: info?.token ?? null })
}
