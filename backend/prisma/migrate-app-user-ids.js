/**
 * Migration Script: Populate appUserId in operational tables
 * 
 * This script populates appUserId in operational tables by mapping userId to appUserId.
 * Run this after AppUser migration to backfill the appUserId columns.
 * 
 * Run: node prisma/migrate-app-user-ids.js
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

async function migrateAppUserIds() {
  console.log('Starting appUserId migration for operational tables...\n');

  // Get mapping of userId to appUserId
  const appUsers = await prisma.appUser.findMany({
    select: { id: true, userId: true },
  });
  
  const userIdToAppUserId = new Map(appUsers.map(au => [au.userId, au.id]));
  console.log(`Found ${appUsers.length} AppUser records\n`);

  // Tables to migrate: shift, fuel_log, incident, daily_report, violation
  const tables = [
    { model: 'shift', prismaModel: prisma.shift, idField: 'id' },
    { model: 'fuelLog', prismaModel: prisma.fuelLog, idField: 'id' },
    { model: 'incident', prismaModel: prisma.incident, idField: 'id' },
    { model: 'dailyReport', prismaModel: prisma.dailyReport, idField: 'id' },
    { model: 'violation', prismaModel: prisma.violation, idField: 'id' },
  ];

  for (const table of tables) {
    try {
      // Get records that have userId but no appUserId
      const records = await table.prismaModel.findMany({
        where: {
          appUserId: null,
        },
        select: { id: true, userId: true },
      });

      console.log(`Processing ${table.model}: ${records.length} records need appUserId`);

      if (records.length === 0) {
        console.log(`  ✓ No records to update for ${table.model}`);
        continue;
      }

      // Build update operations
      let updated = 0;
      for (const record of records) {
        const appUserId = userIdToAppUserId.get(record.userId);
        if (appUserId) {
          await table.prismaModel.update({
            where: { id: record.id },
            data: { appUserId },
          });
          updated++;
        }
      }

      console.log(`  ✓ Updated ${updated} records for ${table.model}`);
    } catch (error) {
      console.error(`  ✗ Error processing ${table.model}:`, error.message);
    }
  }

  console.log('\n✓ appUserId migration completed!');
}

migrateAppUserIds()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });