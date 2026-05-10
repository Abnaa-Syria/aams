const router = require('express').Router();
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { logAudit } = require('../../utils/auditLogger');

const CATEGORY_ORDER = ['users', 'fleet', 'documents', 'shifts', 'hr', 'finance', 'settings', 'audit', 'compliance', 'inventory', 'role', 'dashboard'];

const CATEGORY_LABELS = {
  users: 'إدارة الموظفين',
  fleet: 'الأسطول',
  documents: 'المستندات',
  shifts: 'المناوبات',
  hr: 'الموارد البشرية',
  finance: 'الأمور المالية',
  settings: 'الإعدادات',
  audit: 'سجلات التدقيق',
  compliance: 'الامتثال والسلامة',
  inventory: 'المخزون',
  role: 'الأدوار',
  dashboard: 'لوحة التحكم',
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'مدير عام',
  OPERATIONS_ADMIN: 'مدير عمليات',
  HR_ADMIN: 'مدير موارد بشرية',
  FLEET_ADMIN: 'مدير أسطول',
  FINANCE_ADMIN: 'مدير مالي',
  SUPERVISOR: 'مشرف',
  DRIVER: 'سائق',
};

router.get('/', async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { category: 'asc' } });

    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push({
        key: p.key,
        label: p.labelAr,
      });
    }

    const ordered = CATEGORY_ORDER
      .filter((cat) => grouped[cat])
      .map((cat) => ({
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat] || cat,
        permissions: grouped[cat],
      }));

    return ApiResponse.success(res, ordered);
  } catch (err) { next(err); }
});

router.get('/matrix', async (req, res, next) => {
  try {
    const [permissions, roles] = await Promise.all([
      prisma.permission.findMany({ orderBy: { category: 'asc' } }),
      prisma.role.findMany({
        orderBy: { key: 'asc' },
        include: {
          permissions: {
            include: { permission: { select: { key: true, labelAr: true, category: true } } },
          },
        },
      }),
    ]);

    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push({ key: p.key, label: p.labelAr });
    }

    const orderedPerms = CATEGORY_ORDER
      .filter((cat) => grouped[cat])
      .map((cat) => ({
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat] || cat,
        permissions: grouped[cat],
      }));

    const roleList = roles.map((r) => ({
      key: r.key,
      label: ROLE_LABELS[r.key] || r.labelAr,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      isSystem: r.isSystem,
      permissionCount: r.permissions.length,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));

    return ApiResponse.success(res, { roles: roleList, permissions: orderedPerms });
  } catch (err) { next(err); }
});

router.put('/matrix/:roleKey', ...adminPerm(P.ROLE_MANAGEMENT), async (req, res, next) => {
  try {
    const { roleKey } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return ApiResponse.badRequest(res, 'الصلاحيات يجب أن تكون قائمة');
    }

    if (roleKey === 'SUPER_ADMIN') {
      return ApiResponse.forbidden(res, 'لا يمكن تعديل صلاحيات المدير العام');
    }

    const role = await prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) return ApiResponse.notFound(res, 'الدور');
    if (role.isSystem) {
      return ApiResponse.forbidden(res, 'لا يمكن تعديل صلاحيات الأدوار النظامية');
    }

    const validPerms = await prisma.permission.findMany({ select: { key: true } });
    const validKeys = new Set(validPerms.map((p) => p.key));
    const invalid = permissions.filter((k) => !validKeys.has(k));
    if (invalid.length) {
      return ApiResponse.badRequest(res, `صلاحيات غير صالحة: ${invalid.join(', ')}`);
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permIds = await prisma.permission.findMany({
      where: { key: { in: permissions } },
      select: { id: true },
    });

    await prisma.rolePermission.createMany({
      data: permIds.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entity: 'Role',
      entityId: role.id,
      newValue: { roleKey, permissions },
    });

    return ApiResponse.success(res, null, 'تم تحديث الصلاحيات بنجاح');
  } catch (err) { next(err); }
});

module.exports = router;
