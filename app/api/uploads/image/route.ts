import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]) as Set<string>

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData()
        const file = form.get('file') as File | null
        if (!file) {
            return NextResponse.json({ error: 'กรุณาแนบไฟล์ที่ฟิลด์ "file"' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json({ error: 'ชนิดไฟล์ไม่รองรับ (รองรับเฉพาะ JPEG/PNG)' }, { status: 415 })
        }

        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${(MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB)` }, { status: 413 })
        }

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        await fs.mkdir(uploadsDir, { recursive: true })

        const ext = file.type === 'image/png' ? 'png' : 'jpg'
        const filename = `${crypto.randomUUID()}.${ext}`
        const filepath = path.join(uploadsDir, filename)

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await fs.writeFile(filepath, buffer)

        const urlPath = `/uploads/${filename}`
        return NextResponse.json({ url: urlPath, type: file.type, size: file.size })
    } catch (e: any) {
        console.error('Upload error:', e)
        return NextResponse.json({ error: 'อัปโหลดล้มเหลว' }, { status: 500 })
    }
}


