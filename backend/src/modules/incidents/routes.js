const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

/**
 * @openapi
 * /incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List incidents
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
 *         schema: { type: string, enum: [MEDICAL, ACCIDENT, BREAKDOWN, LARGE_ORDER, OTHER] }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED] }
 *     responses:
 *       200:
 *         description: Incidents list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.type && { type: req.query.type }),
      ...(req.query.severity && { severity: req.query.severity }),
      ...(req.query.status && { status: req.query.status }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.incident.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          attachments: true,
        },
      }),
      prisma.incident.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Incident with attachments
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.incident.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true, mobileNumber: true } }, shift: true, attachments: true },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Report incident (multipart attachments, max 5)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               type: { type: string, enum: [MEDICAL, ACCIDENT, BREAKDOWN, LARGE_ORDER, OTHER] }
 *               customType: { type: string }
 *               severity: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               title: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               shiftId: { type: integer }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.array('attachments', 5), async (req, res, next) => {
  try {
    let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      type: req.body.type || 'OTHER',
      customType: req.body.customType,
      severity: req.body.severity || 'MEDIUM',
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
      shiftId: req.body.shiftId ? parseInt(req.body.shiftId) : undefined,
    };
    const incident = await prisma.incident.create({ data });

    if (req.files?.length) {
      await prisma.incidentAttachment.createMany({
        data: req.files.map(f => ({ incidentId: incident.id, fileUrl: normalizeStoredUploadPath(f.path), fileName: f.originalname, fileType: f.mimetype })),
      });
    }

    const full = await prisma.incident.findUnique({ where: { id: incident.id }, include: { attachments: true } });
    return ApiResponse.created(res, full, 'Incident reported');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /incidents/{id}/status:
 *   patch:
 *     tags: [Incidents]
 *     summary: Update incident status (admin)
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
 *               status: { type: string, enum: [OPEN, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED] }
 *               resolutionNotes: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const updateData = { status: req.body.status };
    if (req.body.status === 'RESOLVED' || req.body.status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.id;
      updateData.resolutionNotes = req.body.resolutionNotes;
    }
    const item = await prisma.incident.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    await logAudit({ userId: req.user.id, action: 'UPDATE_INCIDENT_STATUS', entity: 'Incident', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Incident status updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /incidents/{id}:
 *   delete:
 *     tags: [Incidents]
 *     summary: Delete incident (admin)
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
router.delete('/:id', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    await prisma.incidentAttachment.deleteMany({ where: { incidentId: parseInt(req.params.id) } });
    await prisma.incident.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Incident deleted');
  } catch (err) { next(err); }
});

module.exports = router;
