// backend/seed.js
// Cria o usuário administrador padrão na primeira execução
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@easyticket.com' }
  })

  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        email: 'admin@easyticket.com',
        password: hash
      }
    })
    console.log('✅ Usuário padrão criado: admin@easyticket.com / admin123')
  } else {
    console.log('ℹ️  Usuário já existe, seed ignorado.')
  }
}

main()
  .catch(e => { console.error('Seed falhou:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
