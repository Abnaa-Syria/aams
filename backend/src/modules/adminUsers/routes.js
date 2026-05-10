const router = require('express').Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN'];
const ADMIN_SELECT = {
  id: true, identityNumber: true, fullNameAr: true, fullNameEn: true,
  email: true, mobileNumber: true, role: true, accountStatus: true,
  lastLoginAt: true, createdAt: true,
};

/**
 * @openapi
 * /admin-users:
 *   get:
 *     tags: [Admin Users]
 *     summary: List admin-role users (SUPER_ADMIN only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated admin users
 *   post:
 *     tags: [Admin Users]
 *     summary: Create admin user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identityNumber, password, fullNameAr, role]
 *             properties:
 *               identityNumber: { type: string }
 *               password: { type: string }
 *               fullNameAr: { type: string }
 *               fullNameEn: { type: string }
 *               email: { type: string }
 *               mobileNumber: { type: string }
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, OPERATIONS_ADMIN, HR_ADMIN, FLEET_ADMIN, FINANCE_ADMIN]
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', ...adminPerm(P.USERS_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const where = { role: { in: ADMIN_ROLES }, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: ADMIN_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /admin-users/{id}:
 *   get:
 *     tags: [Admin Users]
 *     summary: Get admin user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Admin user
 *   put:
 *     tags: [Admin Users]
 *     summary: Update admin user profile/role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Admin Users]
 *     summary: Soft-delete admin user (archive)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.get('/:id', ...adminPerm(P.USERS_READ), async (req, res, next) => {
  try {
    const item = await prisma.user.findFirst({ where: { id: parseInt(req.params.id), role: { in: ADMIN_ROLES } }, select: ADMIN_SELECT });
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

router.post('/', ...adminPerm(P.USERS_WRITE), async (req, res, next) => {
  try {
    const { identityNumber, password, fullNameAr, fullNameEn, email, mobileNumber, role } = req.body;
    if (role && !ADMIN_ROLES.includes(role)) return ApiResponse.badRequest(res, 'Invalid admin role');

    const passwordHash = await bcrypt.hash(password, 12);
    const item = await prisma.user.create({
      data: { identityNumber, passwordHash, fullNameAr, fullNameEn, email, mobileNumber, role, accountStatus: 'ACTIVE' },
      select: ADMIN_SELECT,
    });

    await logAudit({ userId: req.user.id, action: 'CREATE_ADMIN_USER', entity: 'User', entityId: String(item.id) });
    return ApiResponse.created(res, item, 'Admin user created');
  } catch (err) { next(err); }
});

router.put('/:id', ...adminPerm(P.USERS_WRITE), async (req, res, next) => {
  try {
    const { fullNameAr, fullNameEn, email, mobileNumber, role } = req.body;
    const data = { fullNameAr, fullNameEn, email, mobileNumber };
    if (role && ADMIN_ROLES.includes(role)) data.role = role;

    const item = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data, select: ADMIN_SELECT });
    return ApiResponse.success(res, item, 'Admin user updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /admin-users/{id}/reset-password:
 *   patch:
 *     tags: [Admin Users]
 *     summary: Set new password for admin user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset
 */
router.patch('/:id/reset-password', ...adminPerm(P.USERS_WRITE), async (req, res, next) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { passwordHash } });
    await logAudit({ userId: req.user.id, action: 'RESET_ADMIN_PASSWORD', entity: 'User', entityId: req.params.id });
    return ApiResponse.success(res, null, 'Password reset successfully');
  } catch (err) { next(err); }
});

router.delete('/:id', ...adminPerm(P.USERS_WRITE), async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { deletedAt: new Date(), accountStatus: 'ARCHIVED' } });
    await logAudit({ userId: req.user.id, action: 'DELETE_ADMIN_USER', entity: 'User', entityId: req.params.id });
    return ApiResponse.success(res, null, 'Admin user deleted');
  } catch (err) { next(err); }
});

module.exports = router;
