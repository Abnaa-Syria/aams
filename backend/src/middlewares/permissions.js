const { AuthorizationError, AuthenticationError } = require('../utils/errors');
const { ROLE_PERMISSIONS } = require('../constants/permissions');

/**
 * Require one of the given permission strings. SUPER_ADMIN always allowed.
 * Attach after authenticate + authorizeAdmin when used for admin routes.
 */
function requirePermission(...required) {
  return (req, res, next) => {
    if (!req.user) return next(new AuthenticationError());

    if (req.user.role === 'SUPER_ADMIN') return next();

    const granted = ROLE_PERMISSIONS[req.user.role] || [];
    const ok = required.some((p) => granted.includes(p));
    if (!ok) {
      return next(new AuthorizationError('ليس لديك صلاحية لتنفيذ هذا الإجراء', required));
    }
    return next();
  };
}

module.exports = { requirePermission };
