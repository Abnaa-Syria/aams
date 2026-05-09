const router = require('express').Router();
const DocumentController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

/**
 * @openapi
 * /documents:
 *   get:
 *     tags: [Documents]
 *     summary: List documents (admin)
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
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated documents
 */
router.get('/', ...adminPerm(P.DOCUMENTS_READ), DocumentController.list);

/**
 * @openapi
 * /documents/expiring:
 *   get:
 *     tags: [Documents]
 *     summary: Documents expiring soon (admin)
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
router.get('/expiring', ...adminPerm(P.DOCUMENTS_READ), DocumentController.getExpiring);

router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true, fileUrl: true, fileName: true, title: true },
    });
    if (!item) throw new NotFoundError('Document');
    await assertCanAccessDriverRecord(req, item.userId);
    if (!item.fileUrl) throw new NotFoundError('Document file');

    const safeName = (item.fileName || `document-${item.id}`).replace(/[\\/\r\n"]/g, '_');
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

    const uploadRoot = path.resolve(path.join(__dirname, '..', '..', config.upload.dir));
    const relative = String(item.fileUrl).replace(/\\/g, '/').replace(/^\/+/, '');
    const abs = path.resolve(path.join(uploadRoot, relative));
    if (!abs.startsWith(uploadRoot + path.sep)) {
      return res.status(400).json({ success: false, message: 'مسار ملف غير صالح' });
    }
    if (!fs.existsSync(abs)) throw new NotFoundError('File');
    return res.download(abs, safeName);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Document
 *   put:
 *     tags: [Documents]
 *     summary: Update document (multipart file optional)
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
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Documents]
 *     summary: Soft-delete document (admin review permission)
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
router.get('/:id', ...adminPerm(P.DOCUMENTS_READ), DocumentController.getById);

/**
 * @openapi
 * /documents:
 *   post:
 *     tags: [Documents]
 *     summary: Create document (driver uploads own; admin can set userId)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               userId: { type: integer }
 *               type: { type: string }
 *               status: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.single('file'), DocumentController.create);
router.put('/:id', authenticate, upload.single('file'), DocumentController.update);

/**
 * @openapi
 * /documents/{id}/review:
 *   patch:
 *     tags: [Documents]
 *     summary: Review document (admin)
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
router.patch('/:id/review', ...adminPerm(P.DOCUMENTS_REVIEW), DocumentController.review);
router.delete('/:id', ...adminPerm(P.DOCUMENTS_REVIEW), DocumentController.remove);

module.exports = router;
