const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

const { ROLE_PERMISSIONS } = require('../constants/permissions');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        identityNumber: true,
        fullNameAr: true,
        fullNameEn: true,
        role: true,
        accountStatus: true,
        email: true,
        mobileNumber: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.accountStatus === 'ARCHIVED') {
      throw new AuthenticationError('Account is deactivated');
    }

    req.user = {
      ...user,
      appUserId: decoded.appUserId || null,
      appRole: decoded.appRole || null,
    };
    req.user.permissions = ROLE_PERMISSIONS[user.role] || [];
    next();
  } catch (error) {
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError());
    }
    next();
  };
}

function authorizeAdmin(req, res, next) {
  if (!req.user) return next(new AuthenticationError());

  const adminRoles = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN'];
  if (!adminRoles.includes(req.user.role)) {
    return next(new AuthorizationError('Admin access required'));
  }
  next();
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

module.exports = { authenticate, authorize, authorizeAdmin, checkAccountStatus };
