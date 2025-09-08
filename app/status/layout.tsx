import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Status • AI Portal' }

export default function StatusLayout({ children }: { children: React.ReactNode }){
	return children as any
}
