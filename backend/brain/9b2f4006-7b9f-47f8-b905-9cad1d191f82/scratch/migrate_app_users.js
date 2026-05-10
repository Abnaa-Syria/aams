const prisma = require('../../../src/config/database');

async function migrate() {
  console.log('Starting migration of DRIVER/SUPERVISOR users to AppUser...');

  // 1. First migrate SUPERVISORS
  const supervisors = await prisma.user.findMany({
    where: {
      role: 'SUPERVISOR',
      appUser: null,
    },
  });

  console.log(`Found ${supervisors.length} supervisors to migrate.`);

  for (const user of supervisors) {
    try {
      await prisma.appUser.create({
        data: {
          userId: user.id,
          appRole: 'SUPERVISOR',
          availabilityStatus: user.availabilityStatus || 'OFF_DUTY',
          employmentStatus: user.employmentStatus || 'ON_DUTY',
          transportType: user.transportType,
          sevenHundredNumber: user.sevenHundredNumber,
          roomNumber: user.roomNumber,
          tags: user.tags,
          notes: user.notes,
          // Leave supervisorId null for supervisors themselves for now, 
          // or map if they have a supervisor (e.g. nested supervisors)
        },
      });
      console.log(`Migrated Supervisor #${user.id} (${user.fullNameAr})`);
    } catch (err) {
      console.error(`Failed to migrate Supervisor #${user.id}:`, err.message);
    }
  }

  // 2. Now migrate DRIVERS
  const drivers = await prisma.user.findMany({
    where: {
      role: 'DRIVER',
      appUser: null,
    },
  });

  console.log(`Found ${drivers.length} drivers to migrate.`);

  for (const user of drivers) {
    try {
      let appSupervisorId = null;
      
      if (user.supervisorId) {
        // Find the AppUser record for the supervisor (who was just migrated or exists)
        const supervisorAppUser = await prisma.appUser.findFirst({
          where: { userId: user.supervisorId }
        });
        appSupervisorId = supervisorAppUser?.id || null;
      }

      await prisma.appUser.create({
        data: {
          userId: user.id,
          appRole: 'DRIVER',
          availabilityStatus: user.availabilityStatus || 'OFF_DUTY',
          employmentStatus: user.employmentStatus || 'ON_DUTY',
          transportType: user.transportType,
          sevenHundredNumber: user.sevenHundredNumber,
          roomNumber: user.roomNumber,
          tags: user.tags,
          notes: user.notes,
          supervisorId: appSupervisorId,
        },
      });
      console.log(`Migrated Driver #${user.id} (${user.fullNameAr}) assigned to AppSupervisor #${appSupervisorId}`);
    } catch (err) {
      console.error(`Failed to migrate Driver #${user.id}:`, err.message);
    }
  }

  console.log('Migration completed.');
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
