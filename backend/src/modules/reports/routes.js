const router = require('express').Router();
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { DASHBOARD_VIEW_PERMISSIONS } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const ReportController = require('./controller');

/**
 * @openapi
 * /reports/driver-summary/{userId}:
 *   get:
 *     tags: [Reports]
 *     summary: Advanced composite report aggregating shifts, finances, and violations for a specific driver
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Composite summary JSON object
 */
router.get('/driver-summary/:userId', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), ReportController.getDriverSummary);
router.get('/dashboard-overview', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), ReportController.getDashboardOverview);


/**
 * @openapi
 * /reports/driver-productivity:
 *   get:
 *     tags: [Reports]
 *     summary: Group approved daily reports by driver (hours, orders)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Array with user and aggregates
 */

// Driver productivity report
router.get('/driver-productivity', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, userId } = req.query;
    const where = {};
    if (dateFrom || dateTo) { where.reportDate = {}; if (dateFrom) where.reportDate.gte = new Date(dateFrom); if (dateTo) where.reportDate.lte = new Date(dateTo); }
    if (userId) where.userId = parseInt(userId);

    const reports = await prisma.dailyReport.groupBy({
      by: ['userId'],
      _sum: { totalHours: true, totalOrders: true },
      _count: true,
      where: { ...where, status: 'APPROVED' },
    });

    const userIds = reports.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullNameAr: true, identityNumber: true },
    });

    const data = reports.map(r => ({
      ...r,
      user: users.find(u => u.id === r.userId),
    }));

    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /reports/fuel-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Approved fuel totals and breakdown by vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: "{ total, byVehicle }"
 */
router.get('/fuel-summary', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const where = { status: 'APPROVED' };
    if (dateFrom || dateTo) { where.fuelDate = {}; if (dateFrom) where.fuelDate.gte = new Date(dateFrom); if (dateTo) where.fuelDate.lte = new Date(dateTo); }

    const result = await prisma.fuelLog.aggregate({ _sum: { amount: true, liters: true }, _count: true, where });
    const byVehicle = await prisma.fuelLog.groupBy({
      by: ['vehicleId'], _sum: { amount: true, liters: true }, _count: true, where,
    });

    return ApiResponse.success(res, { total: result, byVehicle });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /reports/incidents-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Incident counts by type, severity, status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ byType, bySeverity, byStatus }"
 */
router.get('/incidents-summary', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const byType = await prisma.incident.groupBy({ by: ['type'], _count: true });
    const bySeverity = await prisma.incident.groupBy({ by: ['severity'], _count: true });
    const byStatus = await prisma.incident.groupBy({ by: ['status'], _count: true });
    return ApiResponse.success(res, { byType, bySeverity, byStatus });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /reports/penalties-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Applied penalties by type (sum + count)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ byType }"
 */
router.get('/penalties-summary', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const byType = await prisma.penalty.groupBy({ by: ['type'], _sum: { amount: true }, _count: true, where: { status: 'APPLIED' } });
    return ApiResponse.success(res, { byType });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /reports/expiring-documents:
 *   get:
 *     tags: [Reports]
 *     summary: Documents and licenses expiring within window
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: "{ documents, licenses }"
 */
router.get('/expiring-documents', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + days);
    const [docs, licenses] = await Promise.all([
      prisma.document.findMany({
        where: { deletedAt: null, expiryDate: { lte: futureDate, gte: new Date() } },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.license.findMany({
        where: { deletedAt: null, expiryDate: { lte: futureDate, gte: new Date() } },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);
    return ApiResponse.success(res, { documents: docs, licenses });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /reports/leaves-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Leave requests grouped by type and status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ byType, byStatus }"
 */
router.get('/leaves-summary', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const byType = await prisma.leaveRequest.groupBy({ by: ['leaveType'], _count: true, _sum: { totalDays: true } });
    const byStatus = await prisma.leaveRequest.groupBy({ by: ['status'], _count: true });
    return ApiResponse.success(res, { byType, byStatus });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /reports/platform-performance:
 *   get:
 *     tags: [Reports]
 *     summary: Aggregated app breakdown stats by platform name
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: groupBy platformName
 */
router.get('/platform-performance', ...sharedPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const breakdowns = await prisma.reportAppBreakdown.groupBy({
      by: ['platformName'],
      _sum: { orders: true, hours: true, earnings: true },
      _count: true,
    });
    return ApiResponse.success(res, breakdowns);
  } catch (err) { next(err); }
});

module.exports = router;
