import { getSessionOrBypass } from '@/lib/session'
import ChatHomeClient from './homeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'แชท • AI Portal' }

export default async function ChatIndexPage() {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) {
		return <div className="p-6 text-white">Unauthorized</div>
	}
	return <ChatHomeClient />
}


