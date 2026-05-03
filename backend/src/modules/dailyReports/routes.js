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
 * /daily-reports:
 *   get:
 *     tags: [Daily Reports]
 *     summary: List daily (end of day) reports
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
 *         schema: { type: string, enum: [SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, NEEDS_REVISION] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Daily reports list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.status && { status: req.query.status }),
    };
    where = applyUserOwnedListScope(where, req);
    if (req.query.dateFrom || req.query.dateTo) {
      where.reportDate = {};
      if (req.query.dateFrom) where.reportDate.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.reportDate.lte = new Date(req.query.dateTo);
    }
    const [items, total] = await Promise.all([
      prisma.dailyReport.findMany({
        where, skip, take: limit, orderBy: { reportDate: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          appBreakdowns: true,
          screenshots: true,
        },
      }),
      prisma.dailyReport.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /daily-reports/{id}:
 *   get:
 *     tags: [Daily Reports]
 *     summary: Get daily report by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Report
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.dailyReport.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true } },
        shift: { select: { id: true, startedAt: true, endedAt: true } },
        appBreakdowns: true, screenshots: true,
      },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /daily-reports:
 *   post:
 *     tags: [Daily Reports]
 *     summary: Submit daily report (multipart screenshots; appBreakdowns as JSON string)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               shiftId: { type: integer }
 *               reportDate: { type: string, format: date }
 *               totalHours: { type: number }
 *               totalOrders: { type: integer }
 *               notes: { type: string }
 *               appBreakdowns: { type: string, description: JSON array string }
 *               screenshots:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.array('screenshots', 10), async (req, res, next) => {
  try {
    let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      shiftId: req.body.shiftId ? parseInt(req.body.shiftId) : undefined,
      reportDate: new Date(req.body.reportDate || Date.now()),
      totalHours: req.body.totalHours ? parseFloat(req.body.totalHours) : undefined,
      totalOrders: req.body.totalOrders ? parseInt(req.body.totalOrders) : undefined,
      notes: req.body.notes,
    };

    const report = await prisma.dailyReport.create({ data });

    if (req.body.appBreakdowns) {
      const breakdowns = JSON.parse(req.body.appBreakdowns);
      await prisma.reportAppBreakdown.createMany({
        data: breakdowns.map(b => ({
          reportId: report.id,
          platformName: b.platformName,
          orders: b.orders ? parseInt(b.orders) : undefined,
          hours: b.hours ? parseFloat(b.hours) : undefined,
          earnings: b.earnings ? parseFloat(b.earnings) : undefined,
        })),
      });
    }

    if (req.files?.length) {
      await prisma.reportScreenshot.createMany({
        data: req.files.map(f => ({ reportId: report.id, fileUrl: normalizeStoredUploadPath(f.path), fileName: f.originalname })),
      });
    }

    const full = await prisma.dailyReport.findUnique({
      where: { id: report.id },
      include: { appBreakdowns: true, screenshots: true },
    });
    return ApiResponse.created(res, full, 'Daily report submitted');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /daily-reports/{id}/review:
 *   patch:
 *     tags: [Daily Reports]
 *     summary: Review daily report (admin)
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
 *               status: { type: string, enum: [SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, NEEDS_REVISION] }
 *               reviewNotes: { type: string }
 *     responses:
 *       200:
 *         description: Reviewed
 */
router.patch('/:id/review', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.dailyReport.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes: req.body.reviewNotes },
    });
    await logAudit({ userId: req.user.id, action: 'REVIEW_DAILY_REPORT', entity: 'DailyReport', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Report reviewed');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /daily-reports/{id}:
 *   delete:
 *     tags: [Daily Reports]
 *     summary: Delete daily report (admin)
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
    await prisma.reportScreenshot.deleteMany({ where: { reportId: parseInt(req.params.id) } });
    await prisma.reportAppBreakdown.deleteMany({ where: { reportId: parseInt(req.params.id) } });
    await prisma.dailyReport.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Daily report deleted');
  } catch (err) { next(err); }
});

module.exports = router;
