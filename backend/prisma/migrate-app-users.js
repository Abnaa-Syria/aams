/**
 * Populate AppUser from users with legacy DRIVER/SUPERVISOR role or userType=APP_USER.
 * Run: node prisma/migrate-app-users.js
 */
require('dotenv').config();
const prisma = require('../src/config/database');

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN']);

async function findOperationalUsers() {
  const hasUserType = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM users LIKE 'userType'`);
  if (hasUserType.length) {
    return prisma.user.findMany({
      where: { userType: 'APP_USER', deletedAt: null },
      include: { appUser: true },
    });
  }
  return prisma.$queryRawUnsafe(`
    SELECT * FROM users WHERE deletedAt IS NULL AND role IN ('DRIVER', 'SUPERVISOR')
  `);
}

function resolveAppRole(user) {
  if (user.appUser?.appRole) return user.appUser.appRole;
  if (user.role === 'DRIVER' || user.role === 'SUPERVISOR') return user.role;
  return 'DRIVER';
}

async function migrateAppUsers() {
  console.log('Starting AppUser migration...\n');

  const operationalUsers = await findOperationalUsers();
  console.log(`Found ${operationalUsers.length} operational users\n`);

  const appUserMap = new Map();

  for (const user of operationalUsers) {
    if (user.appUser) {
      appUserMap.set(user.id, user.appUser.id);
      continue;
    }
    try {
      const appRole = resolveAppRole(user);
      const appUser = await prisma.appUser.create({
        data: {
          userId: user.id,
          appRole,
          availabilityStatus: user.availabilityStatus || 'OFF_DUTY',
          employmentStatus: user.employmentStatus || 'ON_DUTY',
          transportType: user.transportType || null,
          sevenHundredNumber: user.sevenHundredNumber,
          roomNumber: user.roomNumber,
          tags: user.tags,
          notes: user.notes,
        },
      });
      appUserMap.set(user.id, appUser.id);
      console.log(`✓ AppUser for user ${user.id} (${user.fullNameAr}) — ${appRole}`);
    } catch (error) {
      console.error(`✗ user ${user.id}:`, error.message);
    }
  }

  const supervisorUpdates = [];
  for (const user of operationalUsers) {
    if (!user.supervisorId || !appUserMap.has(user.supervisorId)) continue;
    const appUserId = appUserMap.get(user.id);
    const supervisorAppUserId = appUserMap.get(user.supervisorId);
    if (!appUserId || !supervisorAppUserId) continue;
    supervisorUpdates.push(
      prisma.appUser.update({
        where: { id: appUserId },
        data: { supervisorId: supervisorAppUserId },
      }),
    );
  }
  if (supervisorUpdates.length) {
    await prisma.$transaction(supervisorUpdates);
    console.log(`\nUpdated ${supervisorUpdates.length} supervisor links`);
  }

  const hasUserType = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM users LIKE 'userType'`);
  if (hasUserType.length) {
    await prisma.$executeRawUnsafe(`
      UPDATE users SET userType = 'APP_USER', role = NULL
      WHERE id IN (SELECT userId FROM app_users) AND (userType != 'APP_USER' OR role IS NOT NULL)
    `);
  }

  console.log('\n--- Summary ---');
  console.log('app_users:', await prisma.appUser.count());
  console.log('drivers:', await prisma.appUser.count({ where: { appRole: 'DRIVER' } }));
  console.log('supervisors:', await prisma.appUser.count({ where: { appRole: 'SUPERVISOR' } }));
  console.log('\n✓ Done');
}

migrateAppUsers()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
