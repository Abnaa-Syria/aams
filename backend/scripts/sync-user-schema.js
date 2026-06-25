/**
 * Apply userType split when migrate dev is blocked, then mark migration applied.
 * Also refreshes Prisma migration checksums after edited migration files.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

function migrationChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
  return rows.length > 0;
}

async function refreshChecksums() {
  const dirs = fs.readdirSync(MIGRATIONS_DIR).filter((d) => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory());
  for (const dir of dirs) {
    const sqlPath = path.join(MIGRATIONS_DIR, dir, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;
    const checksum = migrationChecksum(sqlPath);
    await prisma.$executeRawUnsafe(
      `UPDATE _prisma_migrations SET checksum = '${checksum}' WHERE migration_name = '${dir}'`,
    );
    console.log(`checksum updated: ${dir}`);
  }
}

async function applyUserTypeSplit() {
  if (await columnExists('users', 'userType')) {
    console.log('userType column already exists — skipping SQL');
    return;
  }

  console.log('Applying userType split...');
  const steps = [
    `ALTER TABLE \`users\` ADD COLUMN \`userType\` ENUM('ADMIN', 'APP_USER') NOT NULL DEFAULT 'ADMIN'`,
    `UPDATE \`users\` SET \`userType\` = 'APP_USER' WHERE \`role\` IN ('DRIVER', 'SUPERVISOR')`,
    `INSERT INTO \`app_users\` (\`userId\`, \`appRole\`, \`availabilityStatus\`, \`employmentStatus\`, \`transportType\`, \`sevenHundredNumber\`, \`roomNumber\`, \`tags\`, \`notes\`, \`createdAt\`, \`updatedAt\`)
     SELECT u.\`id\`, u.\`role\`, u.\`availabilityStatus\`, u.\`employmentStatus\`, u.\`transportType\`, u.\`sevenHundredNumber\`, u.\`roomNumber\`, u.\`tags\`, u.\`notes\`, u.\`createdAt\`, u.\`updatedAt\`
     FROM \`users\` u WHERE u.\`role\` IN ('DRIVER', 'SUPERVISOR') AND u.\`deletedAt\` IS NULL
     AND NOT EXISTS (SELECT 1 FROM \`app_users\` au WHERE au.\`userId\` = u.\`id\`)`,
    `UPDATE \`app_users\` au INNER JOIN \`users\` u ON u.\`id\` = au.\`userId\`
     INNER JOIN \`app_users\` sup ON sup.\`userId\` = u.\`supervisorId\`
     SET au.\`supervisorId\` = sup.\`id\` WHERE u.\`supervisorId\` IS NOT NULL`,
    `UPDATE \`users\` SET \`role\` = NULL WHERE \`userType\` = 'APP_USER'`,
    `ALTER TABLE \`users\` MODIFY \`role\` ENUM('SUPER_ADMIN','OPERATIONS_ADMIN','HR_ADMIN','FLEET_ADMIN','FINANCE_ADMIN') NULL`,
  ];

  for (const sql of steps) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('userType split applied');
}

async function ensureMigrationRecorded(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM _prisma_migrations WHERE migration_name = '${name}' LIMIT 1`,
  );
  if (rows.length) return;
  const sqlPath = path.join(MIGRATIONS_DIR, name, 'migration.sql');
  const checksum = migrationChecksum(sqlPath);
  await prisma.$executeRawUnsafe(
    `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES (UUID(), '${checksum}', NOW(3), '${name}', NULL, NULL, NOW(3), 1)`,
  );
  console.log(`recorded migration: ${name}`);
}

async function main() {
  await applyUserTypeSplit();
  await ensureMigrationRecorded('20260610140000_user_type_split');
  await refreshChecksums();

  const appCount = await prisma.appUser.count();
  const users = await prisma.$queryRawUnsafe(`
    SELECT userType, role, COUNT(*) as c FROM users WHERE deletedAt IS NULL GROUP BY userType, role
  `);
  console.log('app_users:', appCount);
  console.log('users breakdown:', users);
  console.log('\nDone. Try login again. If no users exist, run: node prisma/seed.js');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
