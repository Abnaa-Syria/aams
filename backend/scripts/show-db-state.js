const prisma = require('../src/config/database');
async function main() {
  const counts = await prisma.$queryRawUnsafe(`
    SELECT role, COUNT(*) as c FROM users WHERE deletedAt IS NULL GROUP BY role
  `);
  console.log('users by role:', counts);
  const shifts = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM shifts LIKE 'appUserId'`);
  console.log('shifts.appUserId:', shifts);
}
main().finally(() => prisma.$disconnect());
