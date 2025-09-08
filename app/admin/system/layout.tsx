import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin • System • AI Portal' }

export default function AdminSystemLayout({ children }: { children: React.ReactNode }){
	return children as any
}
