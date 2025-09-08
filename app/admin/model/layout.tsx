import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin • Models • AI Portal' }

export default function AdminModelLayout({ children }: { children: React.ReactNode }){
	return children as any
}
