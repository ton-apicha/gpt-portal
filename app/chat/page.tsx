import { getSessionOrBypass } from '@/lib/session'
import type { Metadata } from 'next'
import AutoNewClient from './autoNewClient'

export const metadata: Metadata = { title: 'แชท • AI Portal' }

export default async function ChatIndexPage() {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) {
		return <div className="p-6 text-white">Unauthorized</div>
	}
	return <AutoNewClient />
}


