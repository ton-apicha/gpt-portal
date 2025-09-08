import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'ลืมรหัสผ่าน • AI Portal' }

export default function ResetLayout({ children }: { children: React.ReactNode }){
	return children as any
}
