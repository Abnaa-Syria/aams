const router = require('express').Router();
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { key: 'asc' },
      include: {
        permissions: {
          include: { permission: { select: { key: true, labelAr: true, labelEn: true, category: true } } },
        },
      },
    });

    const result = roles.map((r) => ({
      key: r.key,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      isSystem: r.isSystem,
      permissionCount: r.permissions.length,
      permissions: r.permissions.map((rp) => ({
        key: rp.permission.key,
        labelAr: rp.permission.labelAr,
        labelEn: rp.permission.labelEn,
        category: rp.permission.category,
      })),
    }));

    return ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

router.get('/:key', async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { key: req.params.key },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) return ApiResponse.notFound(res, 'Role');

    return ApiResponse.success(res, {
      key: role.key,
      labelAr: role.labelAr,
      labelEn: role.labelEn,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key),
    });
  } catch (err) { next(err); }
});

module.exports = router;
