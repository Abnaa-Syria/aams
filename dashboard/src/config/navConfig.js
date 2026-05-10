import { PERMISSIONS as P, DASHBOARD_VIEW_PERMISSIONS } from '../utils/rolePermissions';

/**
 * Each group: { label, items: [{ path, label, iconKey, anyOf: permission strings[], superAdminOnly? }] }
 * iconKey matches DashboardLayout icon map.
 */
export const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [{ path: '/', label: 'لوحة التحكم', iconKey: 'dashboard', anyOf: DASHBOARD_VIEW_PERMISSIONS }],
  },
  {
    label: 'إدارة الموظفين',
    items: [
      { path: '/drivers', label: 'السائقين', iconKey: 'users', anyOf: [P.USERS_READ] },
      { path: '/supervisors', label: 'المشرفين', iconKey: 'supervisors', anyOf: [P.USERS_READ] },
    ],
  },
  {
    label: 'الأسطول',
    items: [
      { path: '/vehicles', label: 'المركبات', iconKey: 'vehicles', anyOf: [P.FLEET_READ] },
      { path: '/maintenance-requests', label: 'طلبات الصيانة', iconKey: 'maintenance', anyOf: [P.INVENTORY_READ] },
    ],
  },
  {
    label: 'المستندات',
    items: [
      { path: '/documents', label: 'المستندات', iconKey: 'documents', anyOf: [P.DOCUMENTS_READ] },
      { path: '/licenses', label: 'الرخص والشهادات', iconKey: 'licenses', anyOf: [P.DOCUMENTS_READ] },
      { path: '/bank-accounts', label: 'الحسابات البنكية', iconKey: 'bank', anyOf: [P.FINANCE_READ] },
      { path: '/platform-accounts', label: 'حسابات المنصات', iconKey: 'platform', anyOf: [P.FLEET_READ] },
    ],
  },
  {
    label: 'العمليات',
    items: [
      { path: '/shifts', label: 'الشفتات', iconKey: 'shifts', anyOf: [P.SHIFTS_READ] },
      { path: '/fuel', label: 'سجلات الوقود', iconKey: 'fuel', anyOf: [P.FLEET_READ] },
      { path: '/violations', label: 'المخالفات', iconKey: 'violations', anyOf: [P.COMPLIANCE_READ] },
      { path: '/incidents', label: 'الحوادث والطوارئ', iconKey: 'incidents', anyOf: [P.COMPLIANCE_READ] },
      { path: '/daily-reports', label: 'التقارير اليومية', iconKey: 'reports', anyOf: [P.SHIFTS_READ] },
    ],
  },
  {
    label: 'التواصل',
    items: [
      { path: '/notifications', label: 'الإشعارات', iconKey: 'notifications', anyOf: [P.USERS_READ] },
      { path: '/chat', label: 'المحادثات', iconKey: 'chat', anyOf: [P.USERS_READ] },
      { path: '/tickets', label: 'تذاكر الدعم', iconKey: 'tickets', anyOf: [P.USERS_READ] },
    ],
  },
  {
    label: 'الامتثال والأداء',
    items: [
      { path: '/investigations', label: 'التحقيقات', iconKey: 'investigations', anyOf: [P.COMPLIANCE_READ] },
      { path: '/penalties', label: 'الجزاءات', iconKey: 'penalties', anyOf: [P.COMPLIANCE_READ] },
      { path: '/ratings', label: 'التقييمات', iconKey: 'ratings', anyOf: [P.FLEET_READ] },
      { path: '/rewards', label: 'المكافآت', iconKey: 'rewards', anyOf: [P.HR_READ] },
    ],
  },
  {
    label: 'الموارد البشرية',
    items: [
      { path: '/leaves', label: 'طلبات الإجازة', iconKey: 'leaves', anyOf: [P.HR_READ] },
      { path: '/salary-advances', label: 'السلف', iconKey: 'salary', anyOf: [P.FINANCE_READ, P.HR_READ] },
    ],
  },
  
    {
    label: 'النظام',
    items: [
      { path: '/analytics', label: 'التقارير والتحليلات', iconKey: 'analytics', anyOf: DASHBOARD_VIEW_PERMISSIONS },
      { path: '/settings', label: 'الإعدادات', iconKey: 'settings', anyOf: [P.SETTINGS_READ] },
      { path: '/admins', label: 'المستخدمين الإداريين', iconKey: 'admins', anyOf: [P.USERS_WRITE] },
      { path: '/roles-permissions', label: 'الأدوار والصلاحيات', iconKey: 'roles', anyOf: [P.ROLE_MANAGEMENT] },
      { path: '/audit-logs', label: 'سجل العمليات', iconKey: 'audit', anyOf: [P.AUDIT_READ] },
    ],
  },

];
