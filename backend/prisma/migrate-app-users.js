/**
 * Migration Script: Populate AppUser from existing Users
 * 
 * This script creates AppUser records for all existing users with role DRIVER or SUPERVISOR.
 * It moves operational fields from User to AppUser and handles the supervisor relationship.
 * 
 * Run: node prisma/migrate-app-users.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

function parseMysqlUrl(url) {
  if (!url) throw new Error('DATABASE_URL is required for Prisma Client');
  const u = new URL(url);
  const database = decodeURIComponent((u.pathname || '').replace(/^\//, '').split('?')[0] || '');
  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password || ''),
    database,
  };
}

const adapter = new PrismaMariaDb(parseMysqlUrl(process.env.DATABASE_URL));

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function migrateAppUsers() {
  console.log('Starting AppUser migration...\n');

  // Get all users with DRIVER or SUPERVISOR role
  const operationalUsers = await prisma.user.findMany({
    where: {
      role: { in: ['DRIVER', 'SUPERVISOR'] },
      deletedAt: null,
    },
  });

  console.log(`Found ${operationalUsers.length} users with role DRIVER or SUPERVISOR\n`);

  // First pass: Create AppUser records (without supervisor relationship initially)
  const appUserMap = new Map(); // Maps userId to appUserId

  for (const user of operationalUsers) {
    try {
      const appUser = await prisma.appUser.create({
        data: {
          userId: user.id,
          appRole: user.role, // DRIVER or SUPERVISOR
          availabilityStatus: user.availabilityStatus || 'OFF_DUTY',
          employmentStatus: user.employmentStatus || 'ON_DUTY',
          transportType: user.transportType,
          sevenHundredNumber: user.sevenHundredNumber,
          roomNumber: user.roomNumber,
          tags: user.tags,
          notes: user.notes,
        },
      });
      
      appUserMap.set(user.id, appUser.id);
      console.log(`✓ Created AppUser for user ${user.id} (${user.fullNameAr}) - ${user.role}`);
    } catch (error) {
      console.error(`✗ Failed to create AppUser for user ${user.id}:`, error.message);
    }
  }

  console.log(`\nCreated ${appUserMap.size} AppUser records\n`);

  // Second pass: Update supervisor relationships
  // This requires mapping old user.supervisorId to new appUser.supervisorId
  const supervisorUpdates = [];

  for (const user of operationalUsers) {
    if (user.supervisorId && appUserMap.has(user.supervisorId)) {
      const appUserId = appUserMap.get(user.id);
      const supervisorAppUserId = appUserMap.get(user.supervisorId);
      
      supervisorUpdates.push(
        prisma.appUser.update({
          where: { id: appUserId },
          data: { supervisorId: supervisorAppUserId },
        })
      );
      
      console.log(`✓ Linked user ${user.id} to supervisor ${user.supervisorId}`);
    }
  }

  if (supervisorUpdates.length > 0) {
    await prisma.$transaction(supervisorUpdates);
    console.log(`\nUpdated ${supervisorUpdates.length} supervisor relationships\n`);
  }

  // Summary
  const appUserCount = await prisma.appUser.count();
  console.log('--- Migration Summary ---');
  console.log(`Total AppUsers created: ${appUserCount}`);
  console.log(`Operational users migrated: ${operationalUsers.length}`);
  
  const driversCount = await prisma.appUser.count({ where: { appRole: 'DRIVER' } });
  const supervisorsCount = await prisma.appUser.count({ where: { appRole: 'SUPERVISOR' } });
  console.log(`  - Drivers: ${driversCount}`);
  console.log(`  - Supervisors: ${supervisorsCount}`);

  console.log('\n✓ AppUser migration completed!');
}

migrateAppUsers()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });