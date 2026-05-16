const { authenticate, requireAdminRole } = require('./auth');
const { requirePermission } = require('./permissions');

/**
 * Spread into route definitions: `router.get('/', ...adminPerm(P.USERS_READ), handler)`
 * Super admin bypasses permission check inside requirePermission.
 */
/**
 * Spread into route definitions for shared Admin/Mobile routes.
 * Allows APP_USER (Driver/Supervisor) to pass authentication without RBAC checks,
 * relying on the Service layer to handle operational scoping.
 */

function adminPerm(...permissions) {
  return [authenticate, requirePermission(...permissions)];
}
function sharedPerm(...permissions) {
  return [
    authenticate,
    (req, res, next) => {
      // APP_USER type bypasses RBAC because services handle data scoping
      if (req.user.userType === 'APP_USER') return next();
      return requirePermission(...permissions)(req, res, next);
    }
  ];
}

module.exports = { adminPerm, sharedPerm };
