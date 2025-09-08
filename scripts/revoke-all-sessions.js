// Revoke all sessions for all users
const { PrismaClient } = require('@prisma/client')

async function main(){
  const prisma = new PrismaClient()
  try{
    // Ensure table exists (best-effort)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        userId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastSeenAt DATETIME,
        userAgent TEXT,
        ip TEXT,
        revokedAt DATETIME
      );
    `)
    const res = await prisma.$executeRawUnsafe(`UPDATE Sessions SET revokedAt = CURRENT_TIMESTAMP WHERE revokedAt IS NULL`)
    console.log('OK: revoked sessions updated')
  }catch(e){
    console.error('ERROR:', e?.message || e)
    process.exitCode = 1
  }finally{
    await prisma.$disconnect()
  }
}

main()


