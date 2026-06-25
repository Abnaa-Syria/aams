const prisma = require('../src/config/database');
async function main() {
  const ok = await prisma.user.findFirst({ include: { appUser: true } });
  console.log('Prisma user query OK, count:', ok ? 1 : 0);
  const cols = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM shifts LIKE 'appUserId'`);
  console.log('shifts.appUserId:', cols.length ? 'yes' : 'no');
}
main().finally(() => prisma.$disconnect());
