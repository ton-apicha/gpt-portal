import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sessions • AI Portal' }

export default function SessionsLayout({ children }: { children: React.ReactNode }){
	return children as any
}
