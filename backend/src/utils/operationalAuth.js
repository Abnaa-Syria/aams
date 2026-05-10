/**
 * Operational Authorization Helpers
 * 
 * These functions help with authorization based on AppUser roles (DRIVER, SUPERVISOR)
 * instead of User roles. Used in operational services (shifts, fuel logs, etc.)
 */

// Check if user is an operational user (has AppUser)
function hasAppUser(req) {
  return req.user?.appUserId !== null && req.user?.appUserId !== undefined;
}

// Check if user is a DRIVER
function isDriver(req) {
  return req.user?.appRole === 'DRIVER';
}

// Check if user is a SUPERVISOR
function isSupervisor(req) {
  return req.user?.appRole === 'SUPERVISOR';
}

// Check if user is an admin/platform user (no AppUser)
function isAdminUser(req) {
  return !hasAppUser(req);
}

// Get the appUserId for operational queries
function getAppUserId(req) {
  return req.user?.appUserId || null;
}

// Get the appRole
function getAppRole(req) {
  return req.user?.appRole || null;
}

/**
 * Build operational filter based on user role
 * 
 * For DRIVER: returns filter to show only their own records
 * For SUPERVISOR: returns filter to show only their assigned drivers' records
 * For ADMIN: returns empty filter (can see all)
 * 
 * @param {Object} req - Express request object with user
 * @param {Object} options - Options for building the filter
 * @param {string} options.appUserIdField - Field name for appUserId in the model (default: 'appUserId')
 * @param {Function} options.getAssignedDriverIds - Async function to get assigned driver appUserIds for supervisor
 * @returns {Object} - Prisma where clause filter
 */
function buildOperationalFilter(req, options = {}) {
  const { 
    appUserIdField = 'appUserId',
    getAssignedDriverIds = null 
  } = options;

  // If not an operational user (no appUserId), return empty filter (admin sees all)
  if (!hasAppUser(req)) {
    return {};
  }

  // DRIVER: can only see their own records
  if (isDriver(req)) {
    return { [appUserIdField]: req.user.appUserId };
  }

  // SUPERVISOR: can see their assigned drivers' records
  if (isSupervisor(req) && getAssignedDriverIds) {
    // This will be handled asynchronously in the service
    return { 
      [appUserIdField]: { 
        in: getAssignedDriverIds // Will be populated by the service
      } 
    };
  }

  // Fallback: for any other case, restrict to self
  return { [appUserIdField]: req.user.appUserId };
}

/**
 * Resolve userId for operational requests
 * 
 * Usage in controllers/routes:
 * - DRIVER: always use their own appUserId from token (cannot specify different user)
 * - SUPERVISOR: use body.userId if provided, else own appUserId
 * - ADMIN: use body.userId if provided, else own appUserId
 * 
 * @param {Object} req - Express request object with user
 * @returns {Number} - The resolved userId (appUserId)
 */
function resolveUserId(req) {
  // DRIVER: cannot specify different user - always use their own
  if (req.user?.appRole === 'DRIVER') {
    return req.user.appUserId;
  }
  
  // Others (SUPERVISOR, ADMIN, or null): can use body.userId if provided
  const bodyUserId = req.body?.userId;
  if (bodyUserId) {
    return parseInt(bodyUserId, 10);
  }
  
  // Default to their own appUserId
  return req.user?.appUserId || req.user?.id;
}

/**
 * Resolve appUserId for service layer
 * Returns the appUserId to use for operational queries
 */
function resolveAppUserId(req) {
  return req.user?.appUserId || null;
}

module.exports = {
  hasAppUser,
  isDriver,
  isSupervisor,
  isAdminUser,
  getAppUserId,
  getAppRole,
  buildOperationalFilter,
  resolveUserId,
  resolveAppUserId,
};