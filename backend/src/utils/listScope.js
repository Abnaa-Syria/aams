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
  const { role, id } = req.user;
  const userIdQuery = req.query.userId ? parseInt(req.query.userId, 10) : null;

  if (ADMIN_ROLES.has(role)) {
    if (userIdQuery) return { ...where, userId: userIdQuery };
    return where;
  }

  if (role === 'DRIVER') {
    return { ...where, userId: id };
  }

  if (role === 'SUPERVISOR') {
    const userClause = {
      supervisorId: id,
      role: 'DRIVER',
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
  const { role, id } = req.user;
  const userIdQuery = req.query.userId ? parseInt(req.query.userId, 10) : null;

  if (ADMIN_ROLES.has(role)) {
    if (userIdQuery) return { ...where, [field]: userIdQuery };
    return where;
  }

  if (role === 'DRIVER') {
    return { ...where, [field]: id };
  }

  if (role === 'SUPERVISOR') {
    return {
      ...where,
      user: {
        supervisorId: id,
        role: 'DRIVER',
        ...(userIdQuery ? { id: userIdQuery } : {}),
      },
    };
  }

  return { ...where, [field]: -1 };
}

function applyMidShiftListScope(where, req) {
  const { role, id } = req.user;
  const shiftId = req.query.shiftId ? parseInt(req.query.shiftId, 10) : null;

  if (ADMIN_ROLES.has(role)) {
    if (shiftId) return { ...where, shiftId };
    return where;
  }
  if (role === 'DRIVER') {
    return { ...where, shift: { userId: id, ...(shiftId ? { id: shiftId } : {}) } };
  }
  if (role === 'SUPERVISOR') {
    return {
      ...where,
      shift: {
        user: { supervisorId: id, role: 'DRIVER' },
        ...(shiftId ? { id: shiftId } : {}),
      },
    };
  }
  return { ...where, shiftId: -1 };
}

module.exports = {
  ADMIN_ROLES,
  applyUserOwnedListScope,
  applyUserOwnedListScopeUserIdField,
  applyMidShiftListScope,
};
