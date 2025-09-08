// Clear LoginAttempts to remove rate limit blocks
const { PrismaClient } = require('@prisma/client')

async function main(){
  const prisma = new PrismaClient()
  try{
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS LoginAttempts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        kind TEXT,
        email TEXT,
        success INTEGER
      );
    `)
    const res = await prisma.$executeRawUnsafe(`DELETE FROM LoginAttempts`)
    console.log('OK: cleared LoginAttempts')
  }catch(e){
    console.error('ERROR:', e?.message || e)
    process.exitCode = 1
  }finally{
    await prisma.$disconnect()
  }
}

main()


