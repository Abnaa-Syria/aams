/**
 * Completes the partially-applied phase3 migration on dev DB.
 * Run once if migrate failed at permission_requests_appUserId_fkey.
 */
const prisma = require('../src/config/database');

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(`SHOW TABLES LIKE '${name}'`);
  return rows.length > 0;
}

async function fkExists(table, constraint) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = '${table}'
      AND CONSTRAINT_NAME = '${constraint}'
    LIMIT 1
  `);
  return rows.length > 0;
}

async function main() {
  if (!(await tableExists('app_users'))) {
    console.log('Creating app_users...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`app_users\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`userId\` INTEGER NOT NULL,
        \`appRole\` ENUM('DRIVER', 'SUPERVISOR') NOT NULL DEFAULT 'DRIVER',
        \`availabilityStatus\` ENUM('AVAILABLE', 'ON_SHIFT', 'ON_LEAVE', 'OFF_DUTY') NOT NULL DEFAULT 'OFF_DUTY',
        \`employmentStatus\` ENUM('ON_DUTY', 'ON_LEAVE', 'SUSPENDED', 'RUNAWAY', 'FINAL_EXIT') NOT NULL DEFAULT 'ON_DUTY',
        \`transportType\` ENUM('CAR', 'MOTORCYCLE', 'TRUCK') NULL,
        \`supervisorId\` INTEGER NULL,
        \`sevenHundredNumber\` VARCHAR(50) NULL,
        \`roomNumber\` VARCHAR(50) NULL,
        \`tags\` VARCHAR(500) NULL,
        \`notes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        UNIQUE INDEX \`app_users_userId_key\`(\`userId\`),
        INDEX \`app_users_userId_idx\`(\`userId\`),
        INDEX \`app_users_appRole_idx\`(\`appRole\`),
        INDEX \`app_users_supervisorId_idx\`(\`supervisorId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`app_users\` ADD CONSTRAINT \`app_users_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`app_users\` ADD CONSTRAINT \`app_users_supervisorId_fkey\`
      FOREIGN KEY (\`supervisorId\`) REFERENCES \`app_users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);
  } else {
    console.log('app_users already exists');
  }

  if (!(await fkExists('permission_requests', 'permission_requests_appUserId_fkey'))) {
    console.log('Adding permission_requests.appUserId FK...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`permission_requests\` ADD CONSTRAINT \`permission_requests_appUserId_fkey\`
      FOREIGN KEY (\`appUserId\`) REFERENCES \`app_users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  if (!(await tableExists('platform_account_work_history'))) {
    console.log('Creating platform_account_work_history...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`platform_account_work_history\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`platformAccountId\` INTEGER NOT NULL,
        \`startDate\` DATETIME(3) NOT NULL,
        \`endDate\` DATETIME(3) NULL,
        \`assignedBy\` INTEGER NULL,
        \`notes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`platform_account_work_history_platformAccountId_idx\`(\`platformAccountId\`),
        INDEX \`platform_account_work_history_startDate_idx\`(\`startDate\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`platform_account_work_history\` ADD CONSTRAINT \`platform_account_work_history_platformAccountId_fkey\`
      FOREIGN KEY (\`platformAccountId\`) REFERENCES \`platform_accounts\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  console.log('Done. Run: npx prisma migrate resolve --applied 20260610120000_client_features_phase3');
  const count = await prisma.appUser.count();
  console.log(`app_users rows: ${count}`);
  if (count === 0) {
    console.log('Tip: backfill drivers/supervisors with: node prisma/migrate-app-users.js');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
