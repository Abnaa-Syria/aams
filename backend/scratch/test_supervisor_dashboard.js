const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
require('dotenv').config();

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
    allowPublicKeyRetrieval: true, // Bypass RSA public key retrieval issue
  };
}

const adapter = new PrismaMariaDb(parseMysqlUrl(process.env.DATABASE_URL));
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        identityNumber: true,
        fullNameAr: true,
        userType: true,
        role: true,
        appUser: {
          select: {
            id: true,
            appRole: true,
          }
        }
      }
    });

    console.log('--- ALL USERS IN DB ---');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Ident: ${u.identityNumber} | Name: ${u.fullNameAr} | Type: ${u.userType} | Role: ${u.role} | AppRole: ${u.appUser?.appRole || 'NONE'}`);
    });
    console.log('-----------------------');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
