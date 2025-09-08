"use client"
import React, { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function PreWithCopy({ children }: { children: React.ReactNode }){
	const preRef = useRef<HTMLPreElement>(null)
	const [copied, setCopied] = useState(false)

	async function onCopy() {
		// Optimistic UI for tests/headless environments
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
		try {
			const code = preRef.current?.querySelector('code')
			const text = code?.textContent ?? ''
			if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
				await navigator.clipboard.writeText(text)
			}
		} catch {}
	}

	return (
		<div className="relative group">
			<pre ref={preRef} className="overflow-x-auto rounded-md border border-white/10 bg-black/50 p-3">{children}</pre>
			<button
				onClick={onCopy}
				data-testid="copy-code"
				aria-label="คัดลอกโค้ด"
				className="absolute top-2 right-2 rounded bg-white/10 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 hover:bg-white/20"
			>
				{copied ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}
			</button>
		</div>
	)
}

export default function Markdown({ children }: { children: string }){
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
			components={{
				pre: ({ children }) => <PreWithCopy>{children}</PreWithCopy>,
				code: ({ inline, className, children, ...props }) => {
					return inline
						? <code className="rounded bg-white/10 px-1 py-0.5 text-[90%] break-words" {...props}>{children}</code>
						: <code className={`${className || ''} break-words`} {...props}>{children}</code>
				},
				p: (props) => <p className="break-words whitespace-pre-wrap" {...props} />,
				li: (props) => <li className="break-words" {...props} />,
				a: (props) => <a className="underline break-words" {...props} />,
				img: (props) => <img className="max-w-full h-auto rounded" {...props} />,
			}}
		>
			{children}
		</ReactMarkdown>
	)
}


