// Usage: node scripts/promote-admin.js <email> [role]
const { PrismaClient } = require('@prisma/client')

async function main() {
  const email = process.argv[2]
  const role = (process.argv[3] || 'ADMIN').toUpperCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Provide a valid email. Example: node scripts/promote-admin.js user@example.com ADMIN')
    process.exit(1)
  }
  if (!['ADMIN', 'USER'].includes(role)) {
    console.error('Role must be ADMIN or USER')
    process.exit(1)
  }
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.update({ where: { email }, data: { role } })
    console.log(`Updated ${user.email} -> role=${user.role}`)
  } catch (e) {
    console.error('Failed to update role:', e.message || e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


