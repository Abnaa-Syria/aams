const prisma = require('../config/database');
const { BusinessLogicError } = require('./errors');

/**
 * Ensures the user has an ACTIVE shift.
 * If no active shift is found, throws a BusinessLogicError.
 * Skip check for Admin roles.
 * 
 * @param {Object} user - The user object (req.user).
 * @param {boolean} throwError - Whether to throw an error if no active shift exists.
 * @returns {Promise<Object|null>} - The active shift record or null.
 */
async function ensureActiveShift(user, throwError = true) {
  if (!user) return null;

  // Skip check for Admin roles
  const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN'];
  if (ADMIN_ROLES.includes(user.role)) {
    return null;
  }

  const activeShift = await prisma.shift.findFirst({
    where: {
      userId: user.id,
      status: 'ACTIVE',
    },
  });

  if (!activeShift && throwError) {
    throw new BusinessLogicError('You must have an ACTIVE shift to perform this action.');
  }

  return activeShift;
}

/**
 * Checks if a user has a shift in any of the specified statuses.
 * 
 * @param {number} userId - The ID of the user.
 * @param {string[]} statuses - Array of statuses to check for.
 * @returns {Promise<Object|null>} - The shift record or null.
 */
async function getShiftWithStatus(userId, statuses) {
  return await prisma.shift.findFirst({
    where: {
      userId,
      status: { in: statuses },
    },
  });
}

module.exports = {
  ensureActiveShift,
  getShiftWithStatus,
};
