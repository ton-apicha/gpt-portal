# AI Portal (Next.js + Prisma + NextAuth + Ollama)

![CI](https://github.com/ton-apicha/gpt-portal/actions/workflows/ci.yml/badge.svg) ![Quick Check](https://github.com/ton-apicha/gpt-portal/actions/workflows/quick-check.yml/badge.svg) ![Coverage](https://codecov.io/gh/ton-apicha/gpt-portal/branch/main/graph/badge.svg) ![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js)

พอร์ทัลแชทภายในสำหรับ `llama3.2-vision` รองรับแชทหลายห้อง, สตรีมคำตอบ, Markdown/Code highlight, ปุ่มคัดลอก, อัปโหลดรูปพร้อมพรีวิว และเทส E2E ด้วย Playwright

## คุณสมบัติหลัก
- Login (NextAuth v4 + Credentials + JWT)
- จัดการแชท: New/Rename/Delete, Sidebar พร้อม Badge จำนวนข้อความ และเมนู ⋯
- สตรีมคำตอบแบบเรียลไทม์ (ReadableStream) + ปุ่มหยุด
- Markdown + โค้ดบล็อกไฮไลต์ + ปุ่ม Copy code / Copy คำตอบ
- อัปโหลดรูป (PNG/JPEG) แสดงพรีวีก่อนส่ง และแนบเข้าบทสนทนาให้ Vision
- Auto-title แชทจากข้อความแรก
- หน้า `/status` และ API `/api/health`
- Prisma (SQLite) เก็บ Users/Chats/Messages
- เทส E2E ครอบคลุม CRUD แชท, สตรีม, Markdown/Copy, Upload รูป

## ความต้องการระบบ
- Node.js 18+ (แนะนำ LTS)
- Windows/Mac/Linux
- Ollama 0.11+ และโมเดล `llama3.2-vision`

## การติดตั้ง
```bash
# 1) ติดตั้ง dependencies
npm install

# 2) Prisma migrate
npx prisma migrate dev --name init

# 3) ดึงโมเดล (เครื่องคุณ)
ollama pull llama3.2-vision
```

## การรัน Dev Server
```bash
# Windows: ใช้สคริปต์เพื่อความเสถียร
./dev.ps1
# หรือ
npm run dev
```
- เปิดเว็บ: `http://localhost:3000`
- ห้องแชท: เปิด `/chat` จะสร้างห้องใหม่และ redirect ไป `/chat/[id]`
- สเตตัส: `http://localhost:3000/status`

## การเชื่อมต่อ Ollama
ค่าเริ่มต้น `OLLAMA_BASE_URL=http://localhost:11434` สามารถตั้งผ่าน ENV หรือ `.env.local`

### ติดตั้ง Ollama บน Windows และตั้ง PATH
1. ดาวน์โหลดตัวติดตั้งจาก `https://ollama.com`
2. ติดตั้งตามขั้นตอน จากนั้นรีสตาร์ต PowerShell/Terminal
3. ตรวจสอบว่าเรียกใช้ได้:
   ```bash
   ollama --version
   ```
   - หากคำสั่งไม่พบ ให้เพิ่มโฟลเดอร์ติดตั้งลงใน PATH (เช่น `C:\Program Files\Ollama`):
     - Windows Search → "Edit the system environment variables" → Environment Variables… → Path → New → ใส่โฟลเดอร์ของ `ollama.exe` → OK
4. ดึงโมเดลที่ต้องใช้:
   ```bash
   ollama pull llama3.2-vision
   ```
5. หากรัน Ollama ไว้บนเครื่องอื่น ให้ตั้งค่าแอปนี้ชี้ไปยังเครื่องนั้น:
   ```bash
   # PowerShell
   $env:OLLAMA_BASE_URL="http://<ip-or-host>:11434"
   ```
   หรือเพิ่มใน `.env.local`:
   ```
   OLLAMA_BASE_URL=http://<ip-or-host>:11434
   ```

## API/เพจสำคัญ
- `GET/POST /api/chats` สร้าง/รายการแชท (รวม `_count.messages`)
- `GET/PATCH/DELETE /api/chats/[id]` อ่าน/เปลี่ยนชื่อ/ลบแชท
- `POST /api/chats/[id]/messages` ส่งข้อความไป Ollama แบบสตรีม (แนบภาพด้วย `![image](/uploads/..)`)
- `POST /api/uploads/image` อัปโหลดรูป field `file` รองรับ `image/png,image/jpeg` สูงสุด 8MB
- `/chat` → redirect ไปห้องใหม่, `/chat/[id]` หน้าแชทหลัก
- `/api/health`, `/status`

## โครงสร้างโฟลเดอร์
```
app/
  api/
    chats/route.ts                 # list/create
    chats/[id]/route.ts            # get/rename/delete
    chats/[id]/messages/route.ts   # stream -> Ollama (Vision)
    uploads/image/route.ts         # upload image (PNG/JPEG)
    health/route.ts                # health check
  chat/
    layout.tsx / sidebarClient.tsx
    [id]/page.tsx / client.tsx     # UI แชทหลัก
  status/page.tsx
components/Markdown.tsx            # Markdown + highlight + copy code
lib/prisma.ts, lib/auth.ts, lib/session.ts
tests/*.spec.ts                    # Playwright tests
```

## การทดสอบ (Playwright)
```bash
# ติดตั้งบราวเซอร์ครั้งแรก
npx playwright install

# ข้าม Auth (เฉพาะเทส/Dev)
set E2E_BYPASS_AUTH=1  # PowerShell: $env:E2E_BYPASS_AUTH="1"

# รันเทสทั้งหมด
npm test
```
รายการเทสสำคัญ: `tests/chat.spec.ts`, `tests/chat-crud.spec.ts`, `tests/chat-markdown.spec.ts`, `tests/chat-copy.spec.ts`, `tests/upload-image.spec.ts`, `tests/image-chat.spec.ts`

## ตัวแปรแวดล้อม
- `OLLAMA_BASE_URL` ค่าเริ่มต้น `http://localhost:11434`
- `E2E_BYPASS_AUTH=1` เพื่อข้าม Auth ในเทส

## Troubleshooting สั้นๆ
- Dev server ค้างบน Windows: ใช้ `dev.ps1`
- สตรีมไม่มา: ตรวจ `/status` และ `OLLAMA_BASE_URL`

## License
ภายในองค์กร
