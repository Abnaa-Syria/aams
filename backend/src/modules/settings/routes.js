const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');

/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get all system settings (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings list
 *   post:
 *     tags: [Settings]
 *     summary: Upsert setting by key (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key: { type: string }
 *               value: { type: string }
 *               description: { type: string }
 *               group: { type: string }
 *     responses:
 *       200:
 *         description: Saved
 */
router.get('/', ...adminPerm(P.SETTINGS_READ), async (req, res, next) => {
  try {
    const items = await prisma.systemSetting.findMany({ orderBy: { group: 'asc' } });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/{key}:
 *   get:
 *     tags: [Settings]
 *     summary: Get one setting by key (any authenticated user)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Setting or null
 */
router.get('/:key', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.systemSetting.findUnique({ where: { key: req.params.key } });
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

router.post('/', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.systemSetting.upsert({
      where: { key: req.body.key },
      create: req.body,
      update: { value: req.body.value, description: req.body.description, group: req.body.group },
    });
    return ApiResponse.success(res, item, 'Setting saved');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/{key}:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete setting by key (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:key', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    await prisma.systemSetting.delete({ where: { key: req.params.key } });
    return ApiResponse.success(res, null, 'Setting deleted');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/master-data/{category}:
 *   get:
 *     tags: [Settings]
 *     summary: Active master data rows for a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List
 */
router.get('/master-data/:category', authenticate, async (req, res, next) => {
  try {
    const items = await prisma.masterDataType.findMany({
      where: { category: req.params.category, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/master-data:
 *   get:
 *     tags: [Settings]
 *     summary: All master data types (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List
 */
router.get('/master-data', ...adminPerm(P.SETTINGS_READ), async (req, res, next) => {
  try {
    const items = await prisma.masterDataType.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/master-data:
 *   post:
 *     tags: [Settings]
 *     summary: Create master data row (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/master-data', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.masterDataType.create({ data: req.body });
    return ApiResponse.created(res, item, 'Master data created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/master-data/{id}:
 *   put:
 *     tags: [Settings]
 *     summary: Update master data (admin)
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
 */
router.put('/master-data/:id', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.masterDataType.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return ApiResponse.success(res, item, 'Master data updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/master-data/{id}:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete master data (admin)
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
router.delete('/master-data/:id', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    await prisma.masterDataType.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Master data deleted');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/cities/list:
 *   get:
 *     tags: [Settings]
 *     summary: Active cities list
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cities
 */
router.get('/cities/list', authenticate, async (req, res, next) => {
  try {
    const items = await prisma.city.findMany({ where: { isActive: true }, orderBy: { nameAr: 'asc' } });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/cities:
 *   post:
 *     tags: [Settings]
 *     summary: Create city (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/cities', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.city.create({ data: req.body });
    return ApiResponse.created(res, item, 'City created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /settings/cities/{id}:
 *   put:
 *     tags: [Settings]
 *     summary: Update city (admin)
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
 */
router.put('/cities/:id', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.city.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return ApiResponse.success(res, item, 'City updated');
  } catch (err) { next(err); }
});

module.exports = router;
