const prisma = require('../config/database');
const { NotFoundError } = require('./errors');

function parsePositiveInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function mergeAppUserIdFilter(where, appUserId) {
  const id = parsePositiveInt(appUserId);
  if (!id) return where;

  return {
    ...where,
    user: {
      ...(where.user || {}),
      appUser: {
        ...(where.user?.appUser || {}),
        id,
      },
    },
  };
}

async function resolveUserIdFromDriverInput(input = {}, fallbackUser = null) {
  const userId = parsePositiveInt(input.userId);
  if (userId) return userId;

  const appUserId = parsePositiveInt(input.appUserId);
  if (appUserId) {
    const appUser = await prisma.appUser.findUnique({
      where: { id: appUserId },
      select: { userId: true },
    });
    if (!appUser) throw new NotFoundError('AppUser');
    return appUser.userId;
  }

  if (fallbackUser?.id) return fallbackUser.id;
  return null;
}

function stripOperationalIdentityFields(data) {
  const { appUserId, ...rest } = data;
  return rest;
}

module.exports = {
  parsePositiveInt,
  mergeAppUserIdFilter,
  resolveUserIdFromDriverInput,
  stripOperationalIdentityFields,
};
