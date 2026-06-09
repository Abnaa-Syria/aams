const prisma = require('../src/config/database');

async function dump() {
  const user = await prisma.user.findFirst({
    where: { fullNameAr: 'محمد الأحمد' },
    include: {
      appUser: true,
      shifts: {
        orderBy: { id: 'desc' }
      }
    }
  });
  console.log('User:', {
    id: user?.id,
    fullNameAr: user?.fullNameAr,
    accountStatus: user?.accountStatus,
    availabilityStatus: user?.availabilityStatus,
    appUser: user?.appUser
  });
  console.log('Shifts:');
  user?.shifts.forEach(s => {
    console.log(`ID: ${s.id}, VehicleId: ${s.vehicleId}, Status: ${s.status}, CreatedAt: ${s.createdAt}, StartedAt: ${s.startedAt}`);
  });
}

dump().finally(() => prisma.$disconnect());
