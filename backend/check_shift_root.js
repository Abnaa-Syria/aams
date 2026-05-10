const prisma = require('./src/config/database');

async function check() {
  const shift = await prisma.shift.findFirst({
    where: { userId: 12, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Active Shift:', JSON.stringify(shift, null, 2));
  
  if (!shift) {
    const lastShift = await prisma.shift.findFirst({
      where: { userId: 12 },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Last Shift (Any status):', JSON.stringify(lastShift, null, 2));
  }
}

check().finally(() => prisma.$disconnect());
