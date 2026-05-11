const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Identity is ONLY User
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        appUser: true, // Operational profile extension
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.accountStatus === 'ARCHIVED') {
      throw new AuthenticationError('Account is deactivated');
    }

    // Attach full identity to request with helper fields for operational context
    req.user = {
      ...user,
      appUserId: user.appUser?.id || null,
      appRole: user.appUser?.appRole || null,
      supervisorId: user.appUser?.supervisorId || null,
    };
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Admin RBAC Guard
 * Checks: req.user.role
 */
function requireAdminRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    
    // Super admin bypass
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Admin role required'));
    }
    next();
  };
}

/**
 * Operational/Mobile Authorization Guard
 * Checks: req.user.appUser?.appRole
 */
function requireAppRole(...appRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    const userAppRole = req.user.appUser?.appRole;
    if (!userAppRole || !appRoles.includes(userAppRole)) {
      return next(new AuthorizationError('Operational role required'));
    }
    next();
  };
}

function checkAccountStatus(...allowedStatuses) {
  return (req, res, next) => {
    if (!req.user) return next(new AuthenticationError());
    if (!allowedStatuses.includes(req.user.accountStatus)) {
      return next(new AuthorizationError(`Account status "${req.user.accountStatus}" is not allowed for this action`));
    }
    next();
  };
}

module.exports = { 
  authenticate, 
  requireAdminRole, 
  requireAppRole,
  checkAccountStatus,
  authorize: requireAdminRole // Backward compatibility for some routes if needed
};
