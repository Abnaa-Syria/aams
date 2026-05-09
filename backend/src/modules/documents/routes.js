const router = require('express').Router();
const DocumentController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');

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
 * /documents/{id}:
 *   patch:
 *     tags: [Documents]
 *     summary: Update document fields (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', authenticate, upload.single('file'), DocumentController.update);

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
