const router = require('express').Router();
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { logAudit } = require('../../utils/auditLogger');

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

router.post('/', ...adminPerm(P.ROLE_MANAGEMENT), async (req, res, next) => {
  try {
    const { key, labelAr, labelEn } = req.body;

    if (!key || typeof key !== 'string' || !/^[A-Z0-9_]+$/.test(key)) {
      return ApiResponse.badRequest(res, 'مفتاح الدور غير صالح. استخدم الأحرف الكبيرة والأرقام والشرطة السفلية فقط');
    }

    if (!labelAr || typeof labelAr !== 'string') {
      return ApiResponse.badRequest(res, 'الاسم العربي للدور مطلوب');
    }

    if (!labelEn || typeof labelEn !== 'string') {
      return ApiResponse.badRequest(res, 'الاسم الإنجليزي للدور مطلوب');
    }

    const existing = await prisma.role.findUnique({ where: { key } });
    if (existing) {
      return ApiResponse.badRequest(res, 'الدور موجود بالفعل');
    }

    const role = await prisma.role.create({ data: { key, labelAr, labelEn } });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ROLE',
      entity: 'Role',
      entityId: role.id,
      newValue: { key, labelAr, labelEn },
    });

    return ApiResponse.success(res, { key: role.key }, 'تم إنشاء الدور بنجاح');
  } catch (err) { next(err); }
});

router.put('/:key', ...adminPerm(P.ROLE_MANAGEMENT), async (req, res, next) => {
  try {
    const { labelAr, labelEn } = req.body;
    const roleKey = req.params.key;

    if (!labelAr || typeof labelAr !== 'string') {
      return ApiResponse.badRequest(res, 'الاسم العربي للدور مطلوب');
    }

    if (!labelEn || typeof labelEn !== 'string') {
      return ApiResponse.badRequest(res, 'الاسم الإنجليزي للدور مطلوب');
    }

    const role = await prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) return ApiResponse.notFound(res, 'الدور');
    if (role.isSystem) return ApiResponse.forbidden(res, 'لا يمكن تعديل دور نظامي');

    await prisma.role.update({
      where: { key: roleKey },
      data: { labelAr, labelEn },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ROLE',
      entity: 'Role',
      entityId: role.id,
      newValue: { key: roleKey, labelAr, labelEn },
    });

    return ApiResponse.success(res, null, 'تم تحديث الدور بنجاح');
  } catch (err) { next(err); }
});

router.delete('/:key', ...adminPerm(P.ROLE_MANAGEMENT), async (req, res, next) => {
  try {
    const roleKey = req.params.key;
    const role = await prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) return ApiResponse.notFound(res, 'الدور');
    if (role.isSystem) return ApiResponse.forbidden(res, 'لا يمكن حذف دور نظامي');

    const assignedCount = await prisma.user.count({ where: { role: roleKey } });
    if (assignedCount > 0) {
      return ApiResponse.badRequest(res, 'لا يمكن حذف الدور لأنه مرتبط بمستخدمين');
    }

    await prisma.role.delete({ where: { key: roleKey } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_ROLE',
      entity: 'Role',
      entityId: role.id,
      oldValue: { key: role.key, labelAr: role.labelAr, labelEn: role.labelEn },
    });

    return ApiResponse.success(res, null, 'تم حذف الدور بنجاح');
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
