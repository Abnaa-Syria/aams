const ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'HR_ADMIN',
  'FLEET_ADMIN',
  'FINANCE_ADMIN',
]);

/**
 * Narrows list queries for DRIVER / SUPERVISOR; admins pass through (+ optional userId filter).
 * Models must relate to User via `user` relation for SUPERVISOR team filter.
 */
function applyUserOwnedListScope(where, req, options = {}) {
  const { role, id, appRole, appUserId } = req.user;
  const userIdQuery = req.query.userId ? parseInt(req.query.userId, 10) : null;

  if (ADMIN_ROLES.has(role)) {
    if (userIdQuery) return { ...where, userId: userIdQuery };
    return where;
  }

  if (appRole === 'DRIVER') {
    return { ...where, userId: id };
  }

  if (appRole === 'SUPERVISOR') {
    const userClause = {
      appUser: { 
        supervisorId: appUserId,
        appRole: 'DRIVER'
      },
      ...(userIdQuery ? { id: userIdQuery } : {}),
    };
    return { ...where, user: userClause };
  }

  return { ...where, userId: -1 };
}

/**
 * For models where the FK is not userId but still tied to a driver user (e.g. maintenance: userId on request).
 */
function applyUserOwnedListScopeUserIdField(where, req, field = 'userId') {
  const { role, id, appRole, appUserId } = req.user;
  const userIdQuery = req.query.userId ? parseInt(req.query.userId, 10) : null;

  if (ADMIN_ROLES.has(role)) {
    if (userIdQuery) return { ...where, [field]: userIdQuery };
    return where;
  }

  if (appRole === 'DRIVER') {
    return { ...where, [field]: id };
  }

  if (appRole === 'SUPERVISOR') {
    return {
      ...where,
      user: {
        appUser: { 
          supervisorId: appUserId,
          appRole: 'DRIVER'
        },
        ...(userIdQuery ? { id: userIdQuery } : {}),
      },
    };
  }

  return { ...where, [field]: -1 };
}

function applyMidShiftListScope(where, req) {
  const { role, id, appRole, appUserId } = req.user;
  const shiftId = req.query.shiftId ? parseInt(req.query.shiftId, 10) : null;

  if (ADMIN_ROLES.has(role)) {
    if (shiftId) return { ...where, shiftId };
    return where;
  }
  if (appRole === 'DRIVER') {
    return { ...where, shift: { userId: id, ...(shiftId ? { id: shiftId } : {}) } };
  }
  if (appRole === 'SUPERVISOR') {
    return {
      ...where,
      shift: {
        user: { 
          appUser: { 
            supervisorId: appUserId,
            appRole: 'DRIVER'
          }
        },
        ...(shiftId ? { id: shiftId } : {}),
      },
    };
  }
  return { ...where, shiftId: -1 };
}

function buildDriverNameUserFilter(query) {
  const driverName = typeof query.driverName === 'string' ? query.driverName.trim() : '';
  if (!driverName) return null;

  return {
    OR: [
      { fullNameAr: { contains: driverName } },
      { fullNameEn: { contains: driverName } },
    ],
  };
}

function mergeDriverNameIntoUserWhere(where, query) {
  const driverNameFilter = buildDriverNameUserFilter(query);
  if (!driverNameFilter) return where;

  return {
    ...where,
    user: {
      ...(where.user || {}),
      ...driverNameFilter,
    },
  };
}

module.exports = {
  ADMIN_ROLES,
  applyUserOwnedListScope,
  applyUserOwnedListScopeUserIdField,
  applyMidShiftListScope,
  buildDriverNameUserFilter,
  mergeDriverNameIntoUserWhere,
};
