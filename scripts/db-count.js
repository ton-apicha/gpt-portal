// Simple DB counts using Prisma Client
const { PrismaClient } = require('@prisma/client')

;(async () => {
  const prisma = new PrismaClient()
  try {
    const [users, chats, messages] = await Promise.all([
      prisma.user.count(),
      prisma.chat.count(),
      prisma.message.count(),
    ])
    console.log(JSON.stringify({ users, chats, messages }))
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => { console.error(e); process.exit(1) })


