'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const items = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/stats', label: 'Usage & Metrics' },
    { href: '/admin/logs', label: 'Logs' },
    { href: '/admin/model', label: 'Models' },
    { href: '/admin/system', label: 'System' },
    { href: '/admin/settings', label: 'Settings' },
]

export default function Sidebar() {
    const pathname = usePathname()
    return (
        <nav className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800">
                <div className="text-lg font-bold">Admin</div>
                <div className="text-xs text-white/50">Control Panel</div>
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
                {items.map((it) => (
                    <li key={it.href}>
                        <Link
                            href={it.href}
                            className={`block px-4 py-2 text-sm transition-colors ${pathname === it.href ? 'bg-gray-800 text-white' : 'text-white/80 hover:bg-gray-800 hover:text-white'}`}
                        >
                            {it.label}
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="px-4 py-3 border-t border-gray-800 text-xs text-white/50 flex items-center justify-between gap-2">
                <span>© {new Date().getFullYear()} AI Portal</span>
                <button onClick={()=>signOut({ callbackUrl: '/login' })} className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Logout</button>
            </div>
        </nav>
    )
}


