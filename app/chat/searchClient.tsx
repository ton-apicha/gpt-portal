'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type SearchResult = { messageId: string; chatId: string; snippet: string }

export default function SearchClient() {
    const [q, setQ] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<SearchResult[]>([])
    const router = useRouter()
    const timer = useRef<any>(null)
    const boxRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!boxRef.current) return
            if (!boxRef.current.contains(e.target as any)) setOpen(false)
        }
        document.addEventListener('click', onDocClick)
        const onFocusSearch = () => {
            const input = boxRef.current?.querySelector('input') as HTMLInputElement | null
            input?.focus()
        }
        window.addEventListener('search:focus', onFocusSearch)
        return () => {
            document.removeEventListener('click', onDocClick)
            window.removeEventListener('search:focus', onFocusSearch)
        }
    }, [])

    async function runSearch(text: string) {
        if (!text.trim()) { setResults([]); return }
        setLoading(true)
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`)
            if (res.ok) {
                const json = await res.json()
                setResults(json.results || [])
            } else {
                setResults([])
            }
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    function onChange(v: string) {
        setQ(v)
        setOpen(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => runSearch(v), 250)
    }

    return (
        <div ref={boxRef} className="relative w-full max-w-xl">
            <input
                value={q}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="ค้นหาประวัติ..."
                className="w-full rounded-md bg-gray-800/80 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/20"
            />
            {open && (
                <div className="absolute left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border border-white/10 bg-gray-900 shadow-lg">
                    {loading && <div className="px-3 py-2 text-xs text-white/60">กำลังค้นหา...</div>}
                    {!loading && results.length === 0 && q.trim() && (
                        <div className="px-3 py-2 text-xs text-white/60">ไม่พบผลลัพธ์</div>
                    )}
                    {!loading && results.map((r) => (
                        <button
                            key={r.messageId}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10"
                            onClick={() => { setOpen(false); router.push(`/chat/${r.chatId}#${r.messageId}`) }}
                        >
                            <span
                                className="text-white/80"
                                dangerouslySetInnerHTML={{
                                    __html: (r.snippet || '')
                                        .replace(/</g, '&lt;')
                                        .replace(/>/g, '&gt;')
                                        .replace(/\[\[\[/g, '<mark>')
                                        .replace(/\]\]\]/g, '</mark>'),
                                }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}


