import { ReactNode } from 'react'
import { getSessionOrBypass } from '@/lib/session'
import Sidebar from './sidebar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return <div className="p-6 text-white">Forbidden</div>
    }
    return (
        <div className="flex h-screen bg-gray-950 text-white">
            <aside className="w-64 shrink-0 border-r border-gray-800 bg-gray-900">
                {/* Sidebar (client) */}
                <Sidebar />
            </aside>
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}


