/**
 * Mirrors backend `src/constants/permissions.js` for menu / UI gating.
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  FLEET_READ: 'fleet:read',
  FLEET_WRITE: 'fleet:write',
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_REVIEW: 'documents:review',
  SHIFTS_READ: 'shifts:read',
  SHIFTS_APPROVE: 'shifts:approve',
  HR_READ: 'hr:read',
  HR_APPROVE: 'hr:approve',
  FINANCE_READ: 'finance:read',
  FINANCE_APPROVE: 'finance:approve',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  AUDIT_READ: 'audit:read',
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',
};

export const DASHBOARD_VIEW_PERMISSIONS = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.FLEET_READ,
  PERMISSIONS.HR_READ,
  PERMISSIONS.FINANCE_READ,
  PERMISSIONS.COMPLIANCE_READ,
];

const ALL = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ALL,
  OPERATIONS_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.FLEET_READ,
    PERMISSIONS.FLEET_WRITE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_REVIEW,
    PERMISSIONS.SHIFTS_READ,
    PERMISSIONS.SHIFTS_APPROVE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.COMPLIANCE_WRITE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.HR_APPROVE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.AUDIT_READ,
  ],
  HR_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_REVIEW,
    PERMISSIONS.HR_READ,
    PERMISSIONS.HR_APPROVE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  FLEET_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.FLEET_READ,
    PERMISSIONS.FLEET_WRITE,
    PERMISSIONS.SHIFTS_READ,
    PERMISSIONS.SHIFTS_APPROVE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.COMPLIANCE_READ,
  ],
  FINANCE_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
};

export function getGrantedPermissions(role) {
  if (!role) return new Set();
  if (role === 'SUPER_ADMIN') return new Set(ALL);
  return new Set(ROLE_PERMISSIONS[role] || []);
}

export function hasAnyPermission(role, permissionList) {
  if (!permissionList?.length) return true;
  const g = getGrantedPermissions(role);
  return permissionList.some((p) => g.has(p));
}

export function canSeeNavItem(role, permissionList, options = {}) {
  if (options.superAdminOnly) return role === 'SUPER_ADMIN';
  return hasAnyPermission(role, permissionList);
}
