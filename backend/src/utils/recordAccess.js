const prisma = require('../config/database');
const { AuthorizationError, BusinessLogicError } = require('./errors');
const { ADMIN_ROLES } = require('./listScope');

function resolveActor(reqOrUser) {
  return reqOrUser?.user || reqOrUser || {};
}

function isSupervisor(reqOrUser) {
  return resolveActor(reqOrUser).appRole === 'SUPERVISOR';
}

function isDriver(reqOrUser) {
  return resolveActor(reqOrUser).appRole === 'DRIVER';
}

function isAdmin(reqOrUser) {
  return ADMIN_ROLES.has(resolveActor(reqOrUser).role);
}

/**
 * Ensures the caller may access a row owned by recordUserId (driver).
 */
async function assertCanAccessDriverRecord(reqOrUser, recordUserId) {
  if (!recordUserId) return;
  const { role, id, appRole, appUserId } = resolveActor(reqOrUser);

  if (ADMIN_ROLES.has(role)) return;

  if (appRole === 'DRIVER') {
    if (recordUserId !== id) throw new AuthorizationError('غير مصرح بعرض هذا السجل');
    return;
  }

  if (appRole === 'SUPERVISOR') {
    if (recordUserId === id) return;
    const driver = await prisma.user.findFirst({
      where: {
        id: recordUserId,
        appUser: { appRole: 'DRIVER' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!driver) throw new AuthorizationError('غير مصرح بعرض هذا السجل');
    return;
  }

  throw new AuthorizationError('غير مصرح بعرض هذا السجل');
}

/**
 * Supervisor may access own records or assigned drivers' records.
 */
async function assertCanAccessOwnOrDriverRecord(req, recordUserId) {
  return assertCanAccessDriverRecord(req, recordUserId);
}

/**
 * Ensures supervisor can act on a shift owned by an assigned driver (not self).
 */
async function assertSupervisorOwnsShiftDriver(reqOrUser, shiftUserId) {
  if (!isSupervisor(reqOrUser)) return;
  const actor = resolveActor(reqOrUser);
  if (shiftUserId === actor.id) {
    throw new AuthorizationError('لا يمكن للمشرف تنفيذ هذا الإجراء على شفته الشخصية');
  }
  const driver = await prisma.user.findFirst({
    where: { id: shiftUserId, appUser: { appRole: 'DRIVER' }, deletedAt: null },
    select: { id: true },
  });
  if (!driver) throw new AuthorizationError('غير مصرح بتنفيذ هذا الإجراء على هذا السائق');
}

/**
 * Blocks supervisor from final-reviewing their own HR/finance requests.
 */
function assertSupervisorCannotFinalReviewOwn(reqOrUser, recordUserId) {
  const actor = resolveActor(reqOrUser);
  if (isSupervisor(reqOrUser) && recordUserId === actor.id) {
    throw new BusinessLogicError('لا يمكن للمشرف اعتماد طلبه الشخصي');
  }
}

/**
 * Supervisor initial review only on pending driver requests (not own).
 */
async function assertSupervisorCanInitialReview(reqOrUser, recordUserId) {
  const actor = resolveActor(reqOrUser);
  if (!isSupervisor(reqOrUser)) return;
  if (recordUserId === actor.id) {
    throw new BusinessLogicError('لا يمكن للمشرف مراجعة طلبه الشخصي');
  }
  await assertCanAccessDriverRecord(reqOrUser, recordUserId);
}

/**
 * Build OR filter: supervisor sees own records + assigned drivers.
 */
function buildSupervisorTeamOrSelfFilter(currentUser, driverRelation = 'user') {
  const driverClause = {
    [driverRelation]: {
      appUser: {
        appRole: 'DRIVER',
      },
    },
  };
  return {
    OR: [
      { userId: currentUser.id },
      driverClause,
    ],
  };
}

module.exports = {
  isSupervisor,
  isDriver,
  isAdmin,
  assertCanAccessDriverRecord,
  assertCanAccessOwnOrDriverRecord,
  assertSupervisorOwnsShiftDriver,
  assertSupervisorCannotFinalReviewOwn,
  assertSupervisorCanInitialReview,
  buildSupervisorTeamOrSelfFilter,
};
