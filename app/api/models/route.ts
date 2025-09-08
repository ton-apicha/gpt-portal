import { NextResponse } from 'next/server'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function GET(){
	const extras = ['llama3.2-vision', 'gpt-oss:120b']
	try{
		const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
		if(!res.ok) throw new Error('bad-upstream')
		const json = await res.json()
		const upstream = Array.isArray(json?.models) ? json.models.map((m:any)=> m?.name).filter(Boolean) : []
		const models = Array.from(new Set([...
			upstream,
			...extras,
		]))
		return NextResponse.json({ models })
	}catch{
		return NextResponse.json({ models: extras })
	}
}
