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
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;
