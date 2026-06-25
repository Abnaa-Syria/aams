import { PERMISSIONS as P, DASHBOARD_VIEW_PERMISSIONS } from '../utils/rolePermissions';

/**
 * Each group: { label, items: [{ path, label, iconKey, anyOf: permission strings[], superAdminOnly?, hideForSupervisor? }] }
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
      { path: '/supervisors', label: 'المشرفين', iconKey: 'supervisors', anyOf: [P.USERS_READ], hideForSupervisor: true },
    ],
  },
  {
    label: 'الأسطول',
    items: [
      { path: '/vehicles', label: 'المركبات', iconKey: 'vehicles', anyOf: [P.FLEET_READ], hideForSupervisor: true },
      { path: '/fleet-map', label: 'خريطة الأسطول', iconKey: 'vehicles', anyOf: [P.FLEET_READ] },
      { path: '/maintenance-requests', label: 'طلبات الصيانة', iconKey: 'maintenance', anyOf: [P.INVENTORY_READ] },
      { path: '/assets', label: 'العهد', iconKey: 'maintenance', anyOf: [P.INVENTORY_READ], hideForSupervisor: true },
    ],
  },
  {
    label: 'المستندات',
    items: [
      { path: '/documents', label: 'المستندات', iconKey: 'documents', anyOf: [P.DOCUMENTS_READ], hideForSupervisor: true },
      { path: '/licenses', label: 'الرخص والشهادات', iconKey: 'licenses', anyOf: [P.DOCUMENTS_READ], hideForSupervisor: true },
      { path: '/bank-accounts', label: 'الحسابات البنكية', iconKey: 'bank', anyOf: [P.FINANCE_READ], hideForSupervisor: true },
      { path: '/platform-accounts', label: 'حسابات المنصات', iconKey: 'platform', anyOf: [P.FLEET_READ], hideForSupervisor: true },
    ],
  },
  {
    label: 'العمليات',
    items: [
      { path: '/shifts', label: 'الشفتات', iconKey: 'shifts', anyOf: [P.SHIFTS_READ] },
      { path: '/fuel', label: 'سجلات الوقود', iconKey: 'fuel', anyOf: [P.FLEET_READ] },
      { path: '/violations', label: 'المخالفات', iconKey: 'violations', anyOf: [P.COMPLIANCE_READ], hideForSupervisor: true },
      { path: '/incidents', label: 'الحوادث والطوارئ', iconKey: 'incidents', anyOf: [P.COMPLIANCE_READ] },
      { path: '/operational-reports', label: 'تقرير التشغيل اليومي', iconKey: 'reports', anyOf: [P.SHIFTS_READ, P.DAILY_REPORTS_READ] },
      { path: '/daily-reports', label: 'التقارير اليومية', iconKey: 'reports', anyOf: [P.SHIFTS_READ, P.DAILY_REPORTS_READ] },
    ],
  },
  {
    label: 'التواصل',
    items: [
      { path: '/notifications', label: 'الإشعارات', iconKey: 'notifications', anyOf: [P.USERS_READ] },
      { path: '/chat', label: 'المحادثات', iconKey: 'chat', anyOf: [P.USERS_READ] },
      { path: '/tickets', label: 'تذاكر الدعم', iconKey: 'tickets', anyOf: [P.USERS_READ], hideForSupervisor: true },
    ],
  },
  {
    label: 'الامتثال والأداء',
    items: [
      { path: '/investigations', label: 'التحقيقات', iconKey: 'investigations', anyOf: [P.COMPLIANCE_READ], hideForSupervisor: true },
      { path: '/penalties', label: 'الجزاءات', iconKey: 'penalties', anyOf: [P.COMPLIANCE_READ], hideForSupervisor: true },
      { path: '/ratings', label: 'التقييمات', iconKey: 'ratings', anyOf: [P.FLEET_READ], hideForSupervisor: true },
      { path: '/rewards', label: 'المكافآت', iconKey: 'rewards', anyOf: [P.HR_READ], hideForSupervisor: true },
    ],
  },
  {
    label: 'الموارد البشرية',
    items: [
      { path: '/leaves', label: 'طلبات الإجازة', iconKey: 'leaves', anyOf: [P.HR_READ] },
      { path: '/permission-requests', label: 'الاستئذانات', iconKey: 'leaves', anyOf: [P.HR_READ] },
      { path: '/salary-advances', label: 'السلف', iconKey: 'salary', anyOf: [P.FINANCE_READ, P.HR_READ] },
    ],
  },
  {
    label: 'النظام',
    items: [
      { path: '/analytics', label: 'التقارير والتحليلات', iconKey: 'analytics', anyOf: DASHBOARD_VIEW_PERMISSIONS, hideForSupervisor: true },
      { path: '/settings', label: 'الإعدادات', iconKey: 'settings', anyOf: [P.SETTINGS_READ], hideForSupervisor: true },
      { path: '/admins', label: 'المستخدمين الإداريين', iconKey: 'admins', anyOf: [P.USERS_WRITE], hideForSupervisor: true },
      { path: '/roles-permissions', label: 'الأدوار والصلاحيات', iconKey: 'roles', anyOf: [P.ROLE_MANAGEMENT], hideForSupervisor: true },
      { path: '/audit-logs', label: 'سجل العمليات', iconKey: 'audit', anyOf: [P.AUDIT_READ], hideForSupervisor: true },
    ],
  },
];
