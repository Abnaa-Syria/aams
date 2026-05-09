const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { AuthorizationError } = require('../../utils/errors');
const fs = require('fs');
const { normalizeStoredUploadPath, resolveStoredPathToAbsolute } = require('../../utils/uploadPath');

/**
 * @openapi
 * /licenses:
 *   get:
 *     tags: [Licenses]
 *     summary: List licenses and certificates
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
 *         name: type
 *         schema: { type: string, enum: [DRIVING_LICENSE, TRANSPORT_LICENSE, MEDICAL_CERTIFICATE, OTHER_CERTIFICATE] }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Licenses list
 */
router.get('/', ...adminPerm(P.DOCUMENTS_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const where = {
      deletedAt: null,
      ...(req.query.userId && { userId: parseInt(req.query.userId) }),
      ...(req.query.type && { type: req.query.type }),
      ...(req.query.status && { status: req.query.status }),
    };
    const [items, total] = await Promise.all([
      prisma.license.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } } }),
      prisma.license.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /licenses/expiring:
 *   get:
 *     tags: [Licenses]
 *     summary: Licenses expiring within N days (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: List
 */
router.get('/expiring', ...adminPerm(P.DOCUMENTS_READ), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + days);
    const items = await prisma.license.findMany({
      where: { deletedAt: null, expiryDate: { lte: futureDate, gte: new Date() } },
      include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /licenses/{id}:
 *   get:
 *     tags: [Licenses]
 *     summary: Get license by ID (scoped for driver/supervisor)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: License
 *   put:
 *     tags: [Licenses]
 *     summary: Update license (multipart file optional)
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
 *               type: { type: string }
 *               status: { type: string }
 *               issueDate: { type: string, format: date }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Updated
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.license.findFirst({ where: { id: parseInt(req.params.id), deletedAt: null }, include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } } });
    if (!item) throw new NotFoundError('License');
    await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.license.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true, fileUrl: true, fileName: true, title: true },
    });
    if (!item) throw new NotFoundError('License');
    await assertCanAccessDriverRecord(req, item.userId);
    if (!item.fileUrl) throw new NotFoundError('License file');

    const safeName = (item.fileName || `license-${item.id}`).replace(/[\\/\r\n"]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    if (/^https?:\/\//i.test(item.fileUrl)) {
      const upstream = await fetch(item.fileUrl);
      if (!upstream.ok) {
        return res.status(502).json({ success: false, message: 'تعذر تنزيل الملف من المصدر' });
      }
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      const ab = await upstream.arrayBuffer();
      return res.send(Buffer.from(ab));
    }

    const abs = resolveStoredPathToAbsolute(item.fileUrl);
    if (!abs) {
      return res.status(400).json({ success: false, message: 'مسار ملف غير صالح' });
    }
    if (!fs.existsSync(abs)) throw new NotFoundError('File');
    return res.download(abs, safeName);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /licenses:
 *   post:
 *     tags: [Licenses]
 *     summary: Create license (multipart file optional)
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
 *               type: { type: string, enum: [DRIVING_LICENSE, TRANSPORT_LICENSE, MEDICAL_CERTIFICATE, OTHER_CERTIFICATE] }
 *               issueDate: { type: string, format: date }
 *               expiryDate: { type: string, format: date }
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
    const data = { ...req.body, userId };
    if (data.issueDate) data.issueDate = new Date(data.issueDate);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    if (req.file) { data.fileUrl = normalizeStoredUploadPath(req.file.path); data.fileName = req.file.originalname; }
    const item = await prisma.license.create({ data });
    return ApiResponse.created(res, item, 'License created');
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const existing = await prisma.license.findFirst({
      where: { id: parseInt(req.params.id, 10), deletedAt: null },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundError('License');
    await assertCanAccessDriverRecord(req, existing.userId);
    const data = { ...req.body };
    if (data.issueDate) data.issueDate = new Date(data.issueDate);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    if (data.userId !== undefined) {
      const newUid = parseInt(data.userId, 10);
      if (!ADMIN_ROLES.has(req.user.role) && newUid !== existing.userId) {
        throw new AuthorizationError('لا يمكن نقل الرخصة لمستخدم آخر');
      }
      data.userId = newUid;
      await assertCanAccessDriverRecord(req, newUid);
    }
    if (req.file) { data.fileUrl = normalizeStoredUploadPath(req.file.path); data.fileName = req.file.originalname; }
    const item = await prisma.license.update({ where: { id: parseInt(req.params.id, 10) }, data });
    return ApiResponse.success(res, item, 'License updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /licenses/{id}/review:
 *   patch:
 *     tags: [Licenses]
 *     summary: Admin review license
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
 *               reviewNotes: { type: string }
 *     responses:
 *       200:
 *         description: Reviewed
 */
router.patch('/:id/review', ...adminPerm(P.DOCUMENTS_REVIEW), async (req, res, next) => {
  try {
    const item = await prisma.license.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes: req.body.reviewNotes },
    });
    await logAudit({ userId: req.user.id, action: 'REVIEW_LICENSE', entity: 'License', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'License reviewed');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /licenses/{id}:
 *   delete:
 *     tags: [Licenses]
 *     summary: Soft-delete license (admin)
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
router.delete('/:id', ...adminPerm(P.DOCUMENTS_REVIEW), async (req, res, next) => {
  try {
    await prisma.license.update({ where: { id: parseInt(req.params.id) }, data: { deletedAt: new Date() } });
    return ApiResponse.success(res, null, 'License deleted');
  } catch (err) { next(err); }
});

module.exports = router;
