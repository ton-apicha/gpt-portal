"use client"
import { SessionProvider } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'

function ThemeInitializer(){
	useEffect(() => {
		try {
			const theme = localStorage.getItem('theme') || 'dark'
			const root = document.documentElement
			if (theme === 'dark') root.classList.add('dark')
			else root.classList.remove('dark')
		} catch {}
	}, [])
	return null
}

export default function Providers({ children }: { children: ReactNode }){
	return (
		<SessionProvider>
			<ThemeInitializer />
			{children}
		</SessionProvider>
	)
}
