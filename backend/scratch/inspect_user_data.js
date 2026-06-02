const prisma = require('../src/config/database');

async function main() {
  const userId = 7;
  console.log(`=== Inspecting User ID ${userId} ===`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      appUser: true,
    },
  });
  console.log('User profile:', JSON.stringify(user, null, 2));

  const appUser = user.appUser;
  if (!appUser) {
    console.log('No AppUser associated with this User.');
    return;
  }

  // Get shifts
  const shifts = await prisma.shift.findMany({
    where: {
      OR: [
        { userId: userId },
        { appUserId: appUser.id }
      ]
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n=== Shifts Count: ${shifts.length} ===`);
  shifts.forEach((s) => {
    console.log(`Shift ID: ${s.id}, userId: ${s.userId}, appUserId: ${s.appUserId}, status: ${s.status}, createdAt: ${s.createdAt.toISOString()}, startedAt: ${s.startedAt ? s.startedAt.toISOString() : null}, endedAt: ${s.endedAt ? s.endedAt.toISOString() : null}`);
  });

  // Get daily reports
  const reports = await prisma.dailyReport.findMany({
    where: {
      OR: [
        { userId: userId },
        { appUserId: appUser.id }
      ]
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n=== Daily Reports Count: ${reports.length} ===`);
  reports.forEach((r) => {
    console.log(`Report ID: ${r.id}, userId: ${r.userId}, appUserId: ${r.appUserId}, shiftId: ${r.shiftId}, createdAt: ${r.createdAt.toISOString()}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
