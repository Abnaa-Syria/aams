export const PERMISSIONS = Object.freeze({
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  FLEET_READ: 'fleet:read',
  FLEET_WRITE: 'fleet:write',
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_REVIEW: 'documents:review',
  DOCUMENTS_WRITE: 'documents:write',
  SHIFTS_READ: 'shifts:read',
  SHIFTS_APPROVE: 'shifts:approve',
  SHIFTS_WRITE: 'shifts:write',
  HR_READ: 'hr:read',
  HR_APPROVE: 'hr:approve',
  HR_WRITE: 'hr:write',
  FINANCE_READ: 'finance:read',
  FINANCE_APPROVE: 'finance:approve',
  FINANCE_WRITE: 'finance:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  AUDIT_READ: 'audit:read',
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  ROLE_MANAGEMENT: 'role:management',
  DASHBOARD_VIEW: 'dashboard:view',
  DAILY_REPORTS_READ: 'daily-reports:read',
  DAILY_REPORTS_WRITE: 'daily-reports:write',
});

export const DASHBOARD_VIEW_PERMISSIONS = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.FLEET_READ,
  PERMISSIONS.HR_READ,
  PERMISSIONS.FINANCE_READ,
  PERMISSIONS.COMPLIANCE_READ,
  PERMISSIONS.DASHBOARD_VIEW,
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
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.SHIFTS_READ,
    PERMISSIONS.SHIFTS_APPROVE,
    PERMISSIONS.SHIFTS_WRITE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.HR_APPROVE,
    PERMISSIONS.HR_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.COMPLIANCE_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  HR_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_REVIEW,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.HR_APPROVE,
    PERMISSIONS.HR_WRITE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  FLEET_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.FLEET_READ,
    PERMISSIONS.FLEET_WRITE,
    PERMISSIONS.SHIFTS_READ,
    PERMISSIONS.SHIFTS_APPROVE,
    PERMISSIONS.SHIFTS_WRITE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_REVIEW,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.COMPLIANCE_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  FINANCE_ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  SUPERVISOR: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.SHIFTS_READ,
    PERMISSIONS.SHIFTS_APPROVE,
    PERMISSIONS.SHIFTS_WRITE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.HR_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FLEET_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DAILY_REPORTS_READ,
  ],
  DRIVER: [],
};

export function isSupervisorUser(user) {
  return user?.role === 'SUPERVISOR' || user?.appRole === 'SUPERVISOR';
}

export function getGrantedPermissions(role) {
  if (!role) return new Set();
  if (role === 'SUPER_ADMIN') return new Set(ALL);
  return new Set(ROLE_PERMISSIONS[role] || []);
}

export function getEffectivePermissions(user) {
  if (!user) return new Set();
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return new Set(user.permissions);
  }
  return getGrantedPermissions(user.role);
}

export function hasAnyPermission(role, permissionList) {
  if (!permissionList?.length) return true;
  const g = getGrantedPermissions(role);
  return permissionList.some((p) => g.has(p));
}

export function hasAnyPermissionForUser(user, permissionList) {
  if (!permissionList?.length) return true;
  const g = getEffectivePermissions(user);
  return permissionList.some((p) => g.has(p));
}

export function canSeeNavItem(role, permissionList, options = {}) {
  if (options.superAdminOnly) return role === 'SUPER_ADMIN';
  return hasAnyPermission(role, permissionList);
}

export function canSeeNavItemForUser(user, permissionList, options = {}) {
  if (options.superAdminOnly) return user?.role === 'SUPER_ADMIN';
  if (options.hideForSupervisor && isSupervisorUser(user)) return false;
  return hasAnyPermissionForUser(user, permissionList);
}
