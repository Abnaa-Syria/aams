const { authenticate, requireAdminRole } = require('./auth');
const { requirePermission } = require('./permissions');

/**
 * Spread into route definitions: `router.get('/', ...adminPerm(P.USERS_READ), handler)`
 * Super admin bypasses permission check inside requirePermission.
 */
function adminPerm(...permissions) {
  return [authenticate, requirePermission(...permissions)];
}

module.exports = { adminPerm };
