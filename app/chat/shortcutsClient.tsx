'use client'
import { useEffect } from 'react'

export default function ShortcutsClient() {
    useEffect(() => {
        async function onKey(e: KeyboardEvent) {
            const isMod = e.ctrlKey || e.metaKey
            if (!isMod) return
            const key = e.key.toLowerCase()
            if (key === 'k') {
                e.preventDefault()
                try { window.dispatchEvent(new Event('search:focus')) } catch {}
            } else if (key === 'n') {
                e.preventDefault()
                try {
                    const res = await fetch('/api/chats', { method: 'POST' })
                    if (res.ok) {
                        const chat = await res.json()
                        location.href = `/chat/${chat.id}`
                    }
                } catch {}
            } else if (key === 'enter') {
                e.preventDefault()
                try { window.dispatchEvent(new Event('chat:send')) } catch {}
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])
    return null
}


