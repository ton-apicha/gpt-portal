# GPT Portal (Next.js + Ollama)

พอร์ทัลสำหรับสนทนากับโมเดลในเครื่องผ่าน Ollama พร้อมระบบล็อกอิน, สตรีมคำตอบแบบเรียลไทม์, หน้า Status และเทส E2E ด้วย Playwright

## คุณสมบัติหลัก
- Login/Register ด้วย Credentials (NextAuth v4 + JWT)
- ห้องแชท `/chat` สตรีมคำตอบ + ปุ่มหยุด + คีย์ลัด Enter/Shift+Enter
- Proxy `/api/chat` → Ollama (`llama3.2-vision`) พร้อม timeout และจำกัดโทเค็น
- `/status` แสดงสถานะระบบ (Ollama up/down, latency)
- เทส E2E หน้าแชทด้วย Playwright (mock stream)

## ความต้องการระบบ
- Node.js 18+ (แนะนำ LTS/ใหม่กว่า)
- Windows/Mac/Linux
- Ollama 0.11+ และโมเดล `llama3.2-vision`

## การติดตั้ง
```bash
# 1) ติดตั้ง dependencies
npm install

# 2) สร้างฐานข้อมูลและ Prisma Client
npx prisma generate
npx prisma migrate dev --name init --skip-generate

# 3) ดึงโมเดล (ฝั่งเครื่องคุณ)
ollama pull llama3.2-vision
```

## การรัน Dev Server
```bash
# แนะนำใช้สคริปต์บน Windows เพื่อกันเทอร์มินัลค้าง
./dev.ps1
# หรือ
npm run dev
```
- เปิดเว็บ: `http://localhost:3000`
- ห้องแชท: `http://localhost:3000/chat`
- สเตตัส: `http://localhost:3000/status`

## การเชื่อมต่อ Ollama
ค่าเริ่มต้นจะใช้ `http://localhost:11434` หากรันพอร์ตอื่น ตั้งค่า Env ต่อไปนี้ได้
```
OLLAMA_BASE_URL=http://localhost:11434
```
สามารถตั้งผ่าน shell หรือไฟล์ `.env.local`

## การทดสอบ (Playwright)
```bash
# ติดตั้งบราวเซอร์ (ครั้งแรก)
npx playwright install

# รันทดสอบทั้งหมด
npm test
```
เทส `tests/chat.spec.ts` จะ mock `/api/chat` ให้สตรีมคำตอบจำลองเพื่อให้เทสรวดเร็วและเสถียร

## โครงสร้างโปรเจกต์
```
app/
  api/
    auth/[...nextauth]/route.ts  # NextAuth (Credentials)
    chat/route.ts                 # Proxy ไป Ollama (สตรีม)
    health/route.ts               # เช็คสถานะ Ollama
  (auth)/login/page.tsx          # หน้า Login
  (auth)/register/page.tsx       # หน้า Register
  chat/page.tsx                  # ห้องแชท (UI โมเดิร์น)
  status/page.tsx                # หน้า Status
lib/
  prisma.ts                      # Prisma Client singleton
  auth.ts                        # ตัวเลือก/Callback ของ NextAuth
prisma/
  schema.prisma                  # สคีมา User/Chat/Message (SQLite)
```

## Troubleshooting
- หน้าช้าหรือค้าง: ตรวจ `/status` ว่า Ollama up และ latency ไม่สูง
- "Failed to fetch": อาจ timeout จากฝั่ง API แนะนำรีเฟรช/ลดคำถาม/เพิ่ม `timeoutMs`
- PSReadLine/PowerShell ค้าง: เปลี่ยนใช้ Command Prompt หรือรันผ่าน `dev.ps1`

## Deploy คร่าวๆ
- Build: `npm run build` แล้ว `npm start`
- ตั้งค่า Env: `NEXTAUTH_SECRET`, `OLLAMA_BASE_URL` และฐานข้อมูลตามจริง

## License
MIT
