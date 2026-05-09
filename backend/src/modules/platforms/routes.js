const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { ADMIN_ROLES } = require('../../utils/listScope');

/**
 * @openapi
 * /platforms:
 *   get:
 *     tags: [Platforms]
 *     summary: List delivery platforms (admins see account counts)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platforms array
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const includeCounts = ADMIN_ROLES.has(req.user.role)
      ? { _count: { select: { accounts: true } } }
      : undefined;
    const items = await prisma.platform.findMany({
      orderBy: { nameAr: 'asc' },
      ...(includeCounts ? { include: includeCounts } : {}),
    });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /platforms/{id}:
 *   get:
 *     tags: [Platforms]
 *     summary: Get platform by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Platform
 *   put:
 *     tags: [Platforms]
 *     summary: Update platform (admin SETTINGS_WRITE)
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
 *     tags: [Platforms]
 *     summary: Delete platform (admin)
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
    const includeCounts = ADMIN_ROLES.has(req.user.role)
      ? { _count: { select: { accounts: true } } }
      : undefined;
    const item = await prisma.platform.findUnique({
      where: { id: parseInt(req.params.id) },
      ...(includeCounts ? { include: includeCounts } : {}),
    });
    if (!item) throw new NotFoundError('Platform');
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /platforms:
 *   post:
 *     tags: [Platforms]
 *     summary: Create platform (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameAr: { type: string }
 *               nameEn: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.platform.create({ data: req.body });
    return ApiResponse.created(res, item, 'Platform created');
  } catch (err) { next(err); }
});

router.put('/:id', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.platform.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return ApiResponse.success(res, item, 'Platform updated');
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const platform = await prisma.platform.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!platform) throw new NotFoundError('Platform');
    const item = await prisma.platform.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: !platform.isActive },
    });
    return ApiResponse.success(res, item, item.isActive ? 'Platform activated' : 'Platform deactivated');
  } catch (err) { next(err); }
});

module.exports = router;
