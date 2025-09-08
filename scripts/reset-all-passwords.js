// Reset all users' passwords to a specified value using Prisma + bcrypt
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

async function main() {
  const prisma = new PrismaClient()
  const newPassword = '1212312121'
  try {
    const hash = await bcrypt.hash(newPassword, 10)
    const result = await prisma.user.updateMany({ data: { passwordHash: hash } })
    console.log(`OK: reset password for ${result.count} users`)
  } catch (err) {
    console.error('ERROR:', err?.message || err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()


