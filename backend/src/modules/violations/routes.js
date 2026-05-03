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
 * /violations:
 *   get:
 *     tags: [Violations]
 *     summary: List violations
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
 *         name: vehicleId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [REPORTED, UNDER_REVIEW, CONFIRMED, DISMISSED, PENALIZED] }
 *     responses:
 *       200:
 *         description: Violations list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.vehicleId && { vehicleId: parseInt(req.query.vehicleId) }),
      ...(req.query.status && { status: req.query.status }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.violation.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          vehicle: { select: { id: true, plateNumber: true } },
        },
      }),
      prisma.violation.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /violations/{id}:
 *   get:
 *     tags: [Violations]
 *     summary: Get violation by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Violation
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.violation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true } }, vehicle: true, shift: { select: { id: true, status: true } } },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /violations:
 *   post:
 *     tags: [Violations]
 *     summary: Report violation (multipart vehicleImage, violationImage optional)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer, description: Admin only }
 *               reason: { type: string }
 *               amount: { type: number }
 *               location: { type: string }
 *               violationDate: { type: string, format: date-time }
 *               vehicleId: { type: integer }
 *               shiftId: { type: integer }
 *               vehicleImage: { type: string, format: binary }
 *               violationImage: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.fields([{ name: 'vehicleImage', maxCount: 1 }, { name: 'violationImage', maxCount: 1 }]), async (req, res, next) => {
  try {
    let uid = parseInt(req.body.userId, 10);
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      reason: req.body.reason,
      amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
      location: req.body.location,
      violationDate: req.body.violationDate ? new Date(req.body.violationDate) : undefined,
      vehicleId: req.body.vehicleId ? parseInt(req.body.vehicleId) : undefined,
      shiftId: req.body.shiftId ? parseInt(req.body.shiftId) : undefined,
    };
    if (req.files?.vehicleImage?.[0]) data.vehicleImageUrl = normalizeStoredUploadPath(req.files.vehicleImage[0].path);
    if (req.files?.violationImage?.[0]) data.violationImageUrl = normalizeStoredUploadPath(req.files.violationImage[0].path);
    const item = await prisma.violation.create({ data });
    return ApiResponse.created(res, item, 'Violation created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /violations/{id}:
 *   put:
 *     tags: [Violations]
 *     summary: Update violation (admin)
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
router.put('/:id', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.amount) data.amount = parseFloat(data.amount);
    if (data.userId) data.userId = parseInt(data.userId);
    if (data.vehicleId) data.vehicleId = parseInt(data.vehicleId);
    const item = await prisma.violation.update({ where: { id: parseInt(req.params.id) }, data });
    return ApiResponse.success(res, item, 'Violation updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /violations/{id}/review:
 *   patch:
 *     tags: [Violations]
 *     summary: Review violation (admin)
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
router.patch('/:id/review', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.violation.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes: req.body.reviewNotes },
    });
    await logAudit({ userId: req.user.id, action: 'REVIEW_VIOLATION', entity: 'Violation', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Violation reviewed');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /violations/{id}:
 *   delete:
 *     tags: [Violations]
 *     summary: Delete violation (admin)
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
    await prisma.violation.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Violation deleted');
  } catch (err) { next(err); }
});

module.exports = router;
