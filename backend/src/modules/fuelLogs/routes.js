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
 * /fuel-logs:
 *   get:
 *     tags: [Fuel Logs]
 *     summary: List fuel logs
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
 *         name: shiftId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED, FLAGGED] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Fuel logs list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.vehicleId && { vehicleId: parseInt(req.query.vehicleId) }),
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.shiftId && { shiftId: parseInt(req.query.shiftId) }),
    };
    if (req.query.dateFrom || req.query.dateTo) {
      where.fuelDate = {};
      if (req.query.dateFrom) where.fuelDate.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.fuelDate.lte = new Date(req.query.dateTo);
    }
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.fuelLog.findMany({
        where, skip, take: limit, orderBy: { fuelDate: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          vehicle: { select: { id: true, plateNumber: true } },
        },
      }),
      prisma.fuelLog.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /fuel-logs/summary:
 *   get:
 *     tags: [Fuel]
 *     summary: Aggregate approved fuel totals (admin COMPLIANCE_READ)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: _sum amount/liters, _count
 */
router.get('/summary', ...adminPerm(P.COMPLIANCE_READ), async (req, res, next) => {
  try {
    const result = await prisma.fuelLog.aggregate({
      _sum: { amount: true, liters: true },
      _count: true,
      where: { status: 'APPROVED' },
    });
    return ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /fuel-logs/{id}:
 *   get:
 *     tags: [Fuel]
 *     summary: Get fuel log by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fuel log
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.fuelLog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true } }, vehicle: true, shift: { select: { id: true, status: true } } },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /fuel-logs:
 *   post:
 *     tags: [Fuel]
 *     summary: Create fuel log (multipart receipt optional)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [vehicleId, amount]
 *             properties:
 *               receipt: { type: string, format: binary }
 *               userId: { type: integer, description: Admin only }
 *               vehicleId: { type: integer }
 *               shiftId: { type: integer }
 *               amount: { type: number }
 *               liters: { type: number }
 *               fuelDate: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Created (may set isDuplicate)
 */
router.post('/', authenticate, upload.single('receipt'), async (req, res, next) => {
  try {
    let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      vehicleId: parseInt(req.body.vehicleId),
      shiftId: req.body.shiftId ? parseInt(req.body.shiftId) : undefined,
      amount: parseFloat(req.body.amount),
      liters: req.body.liters ? parseFloat(req.body.liters) : undefined,
      fuelDate: new Date(req.body.fuelDate || Date.now()),
    };
    if (req.file) data.receiptUrl = normalizeStoredUploadPath(req.file.path);

    // Duplicate check: same user+vehicle+date within 30 min
    const recent = await prisma.fuelLog.findFirst({
      where: { userId: data.userId, vehicleId: data.vehicleId, fuelDate: { gte: new Date(Date.now() - 30 * 60000) } },
    });
    if (recent) data.isDuplicate = true;

    const item = await prisma.fuelLog.create({ data });
    return ApiResponse.created(res, item, 'Fuel log created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /fuel-logs/{id}/review:
 *   patch:
 *     tags: [Fuel]
 *     summary: Review fuel log (admin)
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
 *               status: { type: string, enum: [PENDING, APPROVED, REJECTED, FLAGGED] }
 *               reviewNotes: { type: string }
 *     responses:
 *       200:
 *         description: Reviewed
 */
router.patch('/:id/review', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.fuelLog.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes: req.body.reviewNotes },
    });
    await logAudit({ userId: req.user.id, action: 'REVIEW_FUEL_LOG', entity: 'FuelLog', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Fuel log reviewed');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /fuel-logs/{id}:
 *   delete:
 *     tags: [Fuel]
 *     summary: Delete fuel log (admin)
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
    await prisma.fuelLog.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Fuel log deleted');
  } catch (err) { next(err); }
});

module.exports = router;
