const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking for vehicles with invalid statuses...');
  const vehicles = await prisma.vehicle.findMany();
  
  const validStatuses = [
    'ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'RESERVED', 'DECOMMISSIONED',
    'PENDING_VERIFICATION', 'PENDING_REPLACEMENT',
  ];
  
  for (const v of vehicles) {
    if (!validStatuses.includes(v.status)) {
      console.log(`Vehicle ${v.id} (${v.plateNumber}) has invalid status: ${v.status}. Resetting to ACTIVE.`);
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { status: 'ACTIVE' }
      });
    }
  }
  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
