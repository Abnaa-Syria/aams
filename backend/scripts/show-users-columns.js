const prisma = require('../src/config/database');
prisma.$queryRawUnsafe('SHOW COLUMNS FROM users')
  .then((r) => console.log(r.map((c) => `${c.Field}: ${c.Type}`).join('\n')))
  .finally(() => prisma.$disconnect());
