const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { applyUserOwnedListScope, ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

/**
 * @openapi
 * /investigations:
 *   get:
 *     tags: [Investigations]
 *     summary: List investigations
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
 *         name: status
 *         schema: { type: string, enum: [OPEN, PENDING_RESPONSE, UNDER_REVIEW, CLOSED] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Investigations list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.category && { category: req.query.category }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.investigation.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          createdBy: { select: { id: true, fullNameAr: true } },
          _count: { select: { attachments: true, eventLogs: true } },
        },
      }),
      prisma.investigation.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /investigations/{id}:
 *   get:
 *     tags: [Investigations]
 *     summary: Get investigation with attachments and event log (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Investigation
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.investigation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true } },
        createdBy: { select: { id: true, fullNameAr: true } },
        attachments: true,
        eventLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

router.get('/:id/attachments/:attachmentId/download', authenticate, async (req, res, next) => {
  try {
    const investigationId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);

    const investigation = await prisma.investigation.findUnique({
      where: { id: investigationId },
      select: { userId: true },
    });
    if (!investigation) throw new NotFoundError('Investigation');

    const attachment = await prisma.investigationAttachment.findFirst({
      where: { id: attachmentId, investigationId },
      select: { fileUrl: true, fileName: true },
    });
    if (!attachment) throw new NotFoundError('Investigation Attachment');

    await assertCanAccessDriverRecord(req, investigation.userId);
    const fallbackName = attachment.fileName || 'investigation-attachment';
    await streamAttachmentDownload(res, attachment.fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /investigations:
 *   post:
 *     tags: [Investigations]
 *     summary: Open investigation (admin, multipart attachments)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [userId, title]
 *             properties:
 *               userId: { type: integer }
 *               category: { type: string }
 *               title: { type: string }
 *               details: { type: string }
 *               internalNotes: { type: string }
 *               updateUserStatus: { type: boolean, description: Set driver UNDER_INVESTIGATION }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.COMPLIANCE_WRITE), upload.array('attachments', 5), async (req, res, next) => {
  try {
    const data = {
      userId: parseInt(req.body.userId, 10),
      createdById: req.user.id,
      category: req.body.category,
      title: req.body.title,
      details: req.body.details,
      internalNotes: req.body.internalNotes,
    };
    const investigation = await prisma.investigation.create({ data });

    if (req.files?.length) {
      await prisma.investigationAttachment.createMany({
        data: req.files.map(f => ({ investigationId: investigation.id, fileUrl: normalizeStoredUploadPath(f.path), fileName: f.originalname, uploadedBy: req.user.id })),
      });
    }

    await prisma.investigationEvent.create({ data: { investigationId: investigation.id, action: 'Investigation opened', performedBy: req.user.id } });
    await logAudit({ userId: req.user.id, action: 'CREATE_INVESTIGATION', entity: 'Investigation', entityId: String(investigation.id) });

    // Optionally change user status
    if (req.body.updateUserStatus) {
      await prisma.user.update({ where: { id: parseInt(req.body.userId) }, data: { accountStatus: 'UNDER_INVESTIGATION' } });
    }

    const full = await prisma.investigation.findUnique({ where: { id: investigation.id }, include: { attachments: true, eventLogs: true } });
    return ApiResponse.created(res, full, 'Investigation created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /investigations/{id}/respond:
 *   post:
 *     tags: [Investigations]
 *     summary: Subject submits response (driver or owner; multipart attachments)
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
 *               response: { type: string }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Response recorded; status UNDER_REVIEW
 */
router.post('/:id/respond', authenticate, upload.array('attachments', 3), async (req, res, next) => {
  try {
    const invId = parseInt(req.params.id, 10);
    const inv = await prisma.investigation.findUnique({ where: { id: invId } });
    if (!inv) throw new NotFoundError('Investigation');
    if (!ADMIN_ROLES.has(req.user.role) && inv.userId !== req.user.id) {
      throw new AuthorizationError('يمكن لصاحب التحقيق فقط تقديم الرد');
    }

    const item = await prisma.investigation.update({
      where: { id: invId },
      data: { employeeResponse: req.body.response, respondedAt: new Date(), status: 'UNDER_REVIEW' },
    });

    if (req.files?.length) {
      await prisma.investigationAttachment.createMany({
        data: req.files.map(f => ({ investigationId: invId, fileUrl: normalizeStoredUploadPath(f.path), fileName: f.originalname, uploadedBy: req.user.id })),
      });
    }

    await prisma.investigationEvent.create({ data: { investigationId: invId, action: 'Employee responded', performedBy: req.user.id } });
    return ApiResponse.success(res, item, 'Response submitted');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /investigations/{id}/status:
 *   patch:
 *     tags: [Investigations]
 *     summary: Update investigation status/outcome (admin)
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
 *               status: { type: string, enum: [OPEN, PENDING_RESPONSE, UNDER_REVIEW, CLOSED] }
 *               outcome: { type: string }
 *               internalNotes: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const updateData = { status: req.body.status };
    if (req.body.status === 'CLOSED') {
      updateData.closedAt = new Date();
      updateData.closedBy = req.user.id;
      updateData.outcome = req.body.outcome;
    }
    if (req.body.internalNotes) updateData.internalNotes = req.body.internalNotes;

    const item = await prisma.investigation.update({ where: { id: parseInt(req.params.id) }, data: updateData });

    await prisma.investigationEvent.create({
      data: { investigationId: parseInt(req.params.id), action: `Status changed to ${req.body.status}`, performedBy: req.user.id, notes: req.body.outcome },
    });
    await logAudit({ userId: req.user.id, action: 'UPDATE_INVESTIGATION', entity: 'Investigation', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Investigation updated');
  } catch (err) { next(err); }
});

module.exports = router;
