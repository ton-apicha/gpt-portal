import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]) as Set<string>

function sniffMimeFromMagic(buffer: Buffer): 'image/png' | 'image/jpeg' | null {
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (buffer.length >= 8) {
		const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
		if (png) return 'image/png'
	}
	// JPEG: FF D8 ... FF D9 (check header minimal)
	if (buffer.length >= 3) {
		const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
		if (jpg) return 'image/jpeg'
	}
	return null
}

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData()
        const file = form.get('file') as File | null
        if (!file) {
            return NextResponse.json({ error: 'กรุณาแนบไฟล์ที่ฟิลด์ "file"' }, { status: 400 })
        }

        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${(MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB)` }, { status: 413 })
        }

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        await fs.mkdir(uploadsDir, { recursive: true })

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Sniff real MIME by magic bytes and enforce whitelist
        const sniffed = sniffMimeFromMagic(buffer)
        if (!sniffed || !ALLOWED_TYPES.has(sniffed)) {
            return NextResponse.json({ error: 'ไฟล์ไม่ผ่านการตรวจสอบลายเซ็น (รองรับเฉพาะ JPEG/PNG)' }, { status: 415 })
        }

        const ext = sniffed === 'image/png' ? 'png' : 'jpg'
        const filename = `${crypto.randomUUID()}.${ext}`
        const filepath = path.join(uploadsDir, filename)

        await fs.writeFile(filepath, buffer)

        const urlPath = `/uploads/${filename}`
        return NextResponse.json({ url: urlPath, type: sniffed, size: file.size })
    } catch (e: any) {
        console.error('Upload error:', e)
        return NextResponse.json({ error: 'อัปโหลดล้มเหลว' }, { status: 500 })
    }
}


