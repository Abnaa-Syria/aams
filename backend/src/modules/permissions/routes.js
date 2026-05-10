const router = require('express').Router();
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { logAudit } = require('../../utils/auditLogger');

const CATEGORY_ORDER = ['users', 'fleet', 'documents', 'shifts', 'hr', 'finance', 'settings', 'audit', 'compliance', 'inventory'];

router.get('/', async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { category: 'asc' } });

    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push({
        key: p.key,
        labelAr: p.labelAr,
        labelEn: p.labelEn,
      });
    }

    const ordered = CATEGORY_ORDER
      .filter((cat) => grouped[cat])
      .map((cat) => ({
        category: cat,
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
            include: { permission: { select: { key: true, labelAr: true, labelEn: true, category: true } } },
          },
        },
      }),
    ]);

    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push({ key: p.key, labelAr: p.labelAr, labelEn: p.labelEn });
    }

    const orderedPerms = CATEGORY_ORDER
      .filter((cat) => grouped[cat])
      .map((cat) => ({ category: cat, permissions: grouped[cat] }));

    const roleList = roles.map((r) => ({
      key: r.key,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      isSystem: r.isSystem,
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
      return ApiResponse.badRequest(res, 'permissions must be an array');
    }

    if (roleKey === 'SUPER_ADMIN') {
      return ApiResponse.forbidden(res, 'Cannot modify SUPER_ADMIN permissions');
    }

    const role = await prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) return ApiResponse.notFound(res, 'Role');

    const validPerms = await prisma.permission.findMany({ select: { key: true } });
    const validKeys = new Set(validPerms.map((p) => p.key));
    const invalid = permissions.filter((k) => !validKeys.has(k));
    if (invalid.length) {
      return ApiResponse.badRequest(res, `Invalid permission keys: ${invalid.join(', ')}`);
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permIds = await prisma.permission.findMany({
      where: { key: { in: permissions } },
      select: { id: true, key: true },
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

    return ApiResponse.success(res, null, 'Role permissions updated');
  } catch (err) { next(err); }
});

module.exports = router;
