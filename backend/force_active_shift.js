const prisma = require('./src/config/database');

async function forceActive() {
  const shiftId = 31;
  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: { 
      status: 'ACTIVE',
      startedAt: new Date(),
    }
  });
  console.log('Shift 31 is now ACTIVE:', updated);
  
  // Also ensure user availabilityStatus is ON_SHIFT
  await prisma.user.update({
    where: { id: 12 },
    data: { availabilityStatus: 'ON_SHIFT' }
  });
}

forceActive().finally(() => prisma.$disconnect());
