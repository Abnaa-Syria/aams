const { authenticate } = require('./auth');
const { requirePermission } = require('./permissions');
const { AuthorizationError } = require('../utils/errors');

/**
 * Blocks DRIVER role from admin mutations (review, verify, delete, fleet analytics).
 * Supervisors pass through — services enforce scoping.
 */
function blockDriverMutations(req, res, next) {
  if (req.user?.userType === 'APP_USER' && req.user?.appRole === 'DRIVER') {
    return next(new AuthorizationError('غير مصرح بهذا الإجراء'));
  }
  next();
}

/** Blocks DRIVER from fleet-wide analytics and admin dashboards. */
function blockDriverFleetAccess(req, res, next) {
  if (req.user?.appRole === 'DRIVER') {
    return next(new AuthorizationError('غير مصرح بعرض تقارير الأسطول'));
  }
  next();
}

function adminPerm(...permissions) {
  return [authenticate, requirePermission(...permissions)];
}

/**
 * Shared Admin/Mobile routes — read + create own record.
 * APP_USER bypasses RBAC; services must scope data.
 */
function sharedPerm(...permissions) {
  return [
    authenticate,
    (req, res, next) => {
      if (req.user.userType === 'APP_USER') return next();
      return requirePermission(...permissions)(req, res, next);
    },
  ];
}

/**
 * Admin mutations (review/verify/delete/status) — DRIVER blocked.
 * Supervisors allowed; dashboard admins require permissions.
 */
function adminMutationPerm(...permissions) {
  return [
    authenticate,
    blockDriverMutations,
    (req, res, next) => {
      if (req.user.userType === 'APP_USER') return next();
      return requirePermission(...permissions)(req, res, next);
    },
  ];
}

/** Fleet-wide reports — admin/supervisor only. */
function fleetReportPerm(...permissions) {
  return [
    authenticate,
    blockDriverFleetAccess,
    (req, res, next) => {
      if (req.user.userType === 'APP_USER') return next();
      return requirePermission(...permissions)(req, res, next);
    },
  ];
}

module.exports = {
  adminPerm,
  sharedPerm,
  adminMutationPerm,
  fleetReportPerm,
  blockDriverMutations,
  blockDriverFleetAccess,
};
