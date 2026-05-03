const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

/**
 * @openapi
 * /platform-accounts:
 *   get:
 *     tags: [Platform Accounts]
 *     summary: List platform accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *       - in: query
 *         name: platformId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Platform accounts list
 */
router.get('/', ...adminPerm(P.FLEET_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const where = {
      deletedAt: null,
      ...(req.query.userId && { userId: parseInt(req.query.userId) }),
      ...(req.query.platformId && { platformId: parseInt(req.query.platformId) }),
      ...(req.query.status && { status: req.query.status }),
    };
    const [items, total] = await Promise.all([
      prisma.platformAccount.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          platform: { select: { id: true, nameAr: true, nameEn: true } },
        },
      }),
      prisma.platformAccount.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /platform-accounts/{id}:
 *   get:
 *     tags: [Platform Accounts]
 *     summary: Get platform account by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Platform account
 *   put:
 *     tags: [Platform Accounts]
 *     summary: Update platform account (multipart file optional)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               platformId: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Platform Accounts]
 *     summary: Soft-delete platform account (admin FLEET_WRITE)
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
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.platformAccount.findFirst({
      where: { id: parseInt(req.params.id), deletedAt: null },
      include: { user: { select: { id: true, fullNameAr: true } }, platform: true },
    });
    if (!item) throw new NotFoundError('Platform Account');
    await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /platform-accounts:
 *   post:
 *     tags: [Platform Accounts]
 *     summary: Create platform account (multipart file optional)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               userId: { type: integer }
 *               platformId: { type: integer }
 *               status: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    let userId = parseInt(req.body.userId, 10);
    if (!ADMIN_ROLES.has(req.user.role)) {
      if (req.user.role === 'DRIVER') userId = req.user.id;
      else await assertCanAccessDriverRecord(req, userId);
    }
    const data = { ...req.body, userId, platformId: parseInt(req.body.platformId, 10) };
    if (req.file) data.fileUrl = normalizeStoredUploadPath(req.file.path);
    const item = await prisma.platformAccount.create({ data });
    return ApiResponse.created(res, item, 'Platform account created');
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const existing = await prisma.platformAccount.findFirst({
      where: { id: parseInt(req.params.id, 10), deletedAt: null },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundError('Platform Account');
    await assertCanAccessDriverRecord(req, existing.userId);
    const data = { ...req.body };
    if (data.userId !== undefined) {
      const newUid = parseInt(data.userId, 10);
      if (!ADMIN_ROLES.has(req.user.role) && newUid !== existing.userId) {
        throw new AuthorizationError('لا يمكن نقل الحساب لمستخدم آخر');
      }
      data.userId = newUid;
      await assertCanAccessDriverRecord(req, newUid);
    }
    if (data.platformId) data.platformId = parseInt(data.platformId, 10);
    if (req.file) data.fileUrl = normalizeStoredUploadPath(req.file.path);
    const item = await prisma.platformAccount.update({ where: { id: parseInt(req.params.id, 10) }, data });
    return ApiResponse.success(res, item, 'Platform account updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /platform-accounts/{id}/verify:
 *   patch:
 *     tags: [Platform Accounts]
 *     summary: Verify platform account status (admin)
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
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Verified
 */
router.patch('/:id/verify', ...adminPerm(P.FLEET_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.platformAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status, verifiedBy: req.user.id, verifiedAt: new Date() },
    });
    await logAudit({ userId: req.user.id, action: 'VERIFY_PLATFORM_ACCOUNT', entity: 'PlatformAccount', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Platform account verified');
  } catch (err) { next(err); }
});

router.delete('/:id', ...adminPerm(P.FLEET_WRITE), async (req, res, next) => {
  try {
    await prisma.platformAccount.update({ where: { id: parseInt(req.params.id) }, data: { deletedAt: new Date() } });
    return ApiResponse.success(res, null, 'Platform account deleted');
  } catch (err) { next(err); }
});

module.exports = router;
