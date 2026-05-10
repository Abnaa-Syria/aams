const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const shift = await prisma.shift.findFirst({
    where: { userId: 12, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Active Shift:', shift);
  
  if (!shift) {
    const lastShift = await prisma.shift.findFirst({
      where: { userId: 12 },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Last Shift (Any status):', lastShift);
  }
}

check().finally(() => prisma.$disconnect());
