import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listSessions, revokeSession } from '@/lib/sessions'

export async function GET(){
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
	const items = await listSessions((session.user as any).id)
	return NextResponse.json({ items })
}

export async function POST(req: NextRequest){
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
	const { id } = await req.json().catch(()=>({}))
	if (!id) return NextResponse.json({ error: 'bad-request' }, { status: 400 })
	await revokeSession(String(id), (session.user as any).id)
	return NextResponse.json({ ok: true })
}
