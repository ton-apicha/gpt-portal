// Reset a single user's password: EMAIL and NEW_PASS via env or args
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

async function main() {
  const prisma = new PrismaClient()
  const email = process.env.EMAIL || process.argv[2]
  const newPassword = process.env.NEW_PASS || process.argv[3]
  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-password.js <email> <newPassword>')
    process.exit(1)
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error('User not found:', email)
      process.exitCode = 2
      return
    }
    const hash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { email }, data: { passwordHash: hash } })
    console.log(`OK: reset password for ${email}`)
  } catch (err) {
    console.error('ERROR:', err?.message || err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()


