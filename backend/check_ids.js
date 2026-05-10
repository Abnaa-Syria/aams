const prisma = require('./src/config/database');

async function check() {
  const shift1 = await prisma.shift.findUnique({ where: { id: 1 } });
  console.log('Shift 1:', shift1);
  
  const shift31 = await prisma.shift.findUnique({ where: { id: 31 } });
  console.log('Shift 31:', shift31);
}

check().finally(() => prisma.$disconnect());
