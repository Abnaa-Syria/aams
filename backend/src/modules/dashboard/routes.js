const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { DASHBOARD_VIEW_PERMISSIONS } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { resolvePeriodStartDate } = require('../../utils/periodFilter');

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard KPI summary (operations/HR/fleet/finance dashboard permission)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: overview, pending, alerts, financials
 */
router.get('/', ...adminPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const [
      totalDrivers, activeDrivers, totalVehicles, activeShifts,
      pendingShiftRequests, todayIncidents, pendingDocReviews,
      pendingLeaveRequests, pendingSalaryAdvances, pendingMaintenanceReqs,
      openInvestigations, expiringDocuments, expiringLicenses,
      totalPenalties, totalRewards, pendingVehicleSubmissions,
    ] = await Promise.all([
      prisma.user.count({ where: { userType: 'APP_USER', appUser: { appRole: 'DRIVER' }, deletedAt: null } }),
      prisma.user.count({ where: { userType: 'APP_USER', appUser: { appRole: 'DRIVER' }, accountStatus: 'ACTIVE', deletedAt: null } }),
      prisma.vehicle.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.shift.count({ where: { status: 'ACTIVE' } }),
      prisma.shift.count({ where: { status: 'REQUESTED' } }),
      prisma.incident.count({ where: { createdAt: { gte: today }, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.document.count({ where: { status: 'PENDING', deletedAt: null } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.salaryAdvance.count({ where: { status: 'PENDING' } }),
      prisma.maintenanceRequest.count({ where: { status: { in: ['REQUESTED', 'APPROVED'] } } }),
      prisma.investigation.count({ where: { status: { in: ['OPEN', 'PENDING_RESPONSE', 'UNDER_REVIEW'] } } }),
      prisma.document.count({ where: { deletedAt: null, expiryDate: { lte: thirtyDaysAhead, gte: today } } }),
      prisma.license.count({ where: { deletedAt: null, expiryDate: { lte: thirtyDaysAhead, gte: today } } }),
      prisma.penalty.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'APPLIED' } }),
      prisma.reward.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'APPROVED' } }),
      prisma.vehicle.count({
        where: {
          deletedAt: null,
          ownershipStatus: 'DRIVER_OWNED',
          status: { in: ['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'] },
        },
      }),
    ]);

    const data = {
      overview: { totalDrivers, activeDrivers, totalVehicles, activeShifts },
      pending: {
        pendingShiftRequests,
        pendingDocReviews,
        pendingLeaveRequests,
        pendingSalaryAdvances,
        pendingMaintenanceReqs,
        pendingVehicleSubmissions,
      },
      alerts: { todayIncidents, openInvestigations, expiringDocuments, expiringLicenses },
      financials: {
        totalPenaltiesAmount: totalPenalties._sum.amount || 0,
        totalPenaltiesCount: totalPenalties._count,
        totalRewardsAmount: totalRewards._sum.amount || 0,
        totalRewardsCount: totalRewards._count,
      },
    };

    return ApiResponse.success(res, data, 'Dashboard loaded');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /dashboard/recent-activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent shifts, incidents, daily reports (same dashboard permission as KPI)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: recentShifts, recentIncidents, recentReports
 */
router.get('/recent-activity', ...adminPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const [recentShifts, recentIncidents, recentReports] = await Promise.all([
      prisma.shift.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true } } },
      }),
      prisma.incident.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true } } },
      }),
      prisma.dailyReport.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true } } },
      }),
    ]);
    return ApiResponse.success(res, { recentShifts, recentIncidents, recentReports });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /dashboard/driver:
 *   get:
 *     tags: [Dashboard]
 *     summary: Driver home screen summary (stats + task checklist)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: stats, tasks, currentShift
 */
router.get('/driver', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const period = req.query.period || 'month';
    const startDate = resolvePeriodStartDate(period);

    // 1. Current Active Shift
    const currentShift = await prisma.shift.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        vehicle: { select: { id: true, plateNumber: true } },
        platformAccount: { include: { platform: { select: { nameAr: true } } } },
      },
    });

    // 2. Stats & Info
    const [
      shiftsToday,
      dailyReportsToday,
      dailyReportsMonth,
      dailyReportsWeek,
      fuelToday,
      userRating,
      userProfile,
      dailyReportsPeriod,
      shiftsPeriodCount,
      violationsPeriodCount,
      fuelLogsPeriodCount,
      recentReports,
      endedShiftsPeriodCount,
      reportsPeriodCount,
    ] = await Promise.all([
      prisma.shift.findMany({
        where: { userId, OR: [{ startedAt: { gte: today } }, { status: 'ACTIVE' }] },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.dailyReport.aggregate({
        where: { userId, createdAt: { gte: today } },
        _sum: { totalOrders: true, totalHours: true },
      }),
      prisma.dailyReport.aggregate({
        where: { userId, createdAt: { gte: monthStart } },
        _sum: { totalOrders: true, totalHours: true },
      }),
      prisma.dailyReport.aggregate({
        where: { userId, createdAt: { gte: weekStart } },
        _sum: { totalOrders: true, totalHours: true },
      }),
      prisma.fuelLog.aggregate({
        where: { userId, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.rating.aggregate({
        where: { userId },
        _avg: { overallScore: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { city: { select: { nameAr: true } } },
      }),
      prisma.dailyReport.aggregate({
        where: { userId, reportDate: { gte: startDate } },
        _sum: { totalOrders: true, totalHours: true },
      }),
      prisma.shift.count({
        where: { userId, startedAt: { gte: startDate } }
      }),
      prisma.violation.count({
        where: { userId, violationDate: { gte: startDate } }
      }),
      prisma.fuelLog.count({
        where: { userId, fuelDate: { gte: startDate } }
      }),
      prisma.dailyReport.findMany({
        where: { userId, reportDate: { gte: startDate } },
        orderBy: { reportDate: 'desc' },
        take: 10,
        select: {
          id: true,
          reportDate: true,
          status: true,
          totalHours: true,
          totalOrders: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.shift.count({
        where: { userId, startedAt: { gte: startDate }, status: 'ENDED' },
      }),
      prisma.dailyReport.count({
        where: { userId, reportDate: { gte: startDate } },
      }),
    ]);

    // Calculate daily hours from shifts (real-time)
    let hoursToday = 0;
    shiftsToday.forEach((s) => {
      const start = s.startedAt ? new Date(s.startedAt) : null;
      const end = s.endedAt ? new Date(s.endedAt) : new Date();
      if (start) {
        hoursToday += (end - start) / (1000 * 60 * 60);
      }
    });

    // 3. Task Checklist (for latest shift)
    let tasks = {
      shiftStartPhoto: false,
      midShiftPhoto: false,
      dailyReport: false,
    };

    const latestShift = await prisma.shift.findFirst({
      where: { userId, requestedAt: { gte: today } },
      orderBy: { requestedAt: 'desc' },
      include: {
        midShiftRecords: { take: 1 },
        dailyReports: { take: 1 },
      },
    });

    if (latestShift) {
      tasks.shiftStartPhoto = !!(latestShift.startPhotoUrl || latestShift.startAppPhotoUrl);
      tasks.midShiftPhoto = latestShift.midShiftRecords.length > 0;
      tasks.dailyReport = latestShift.dailyReports.length > 0;
    }

    const ratingVal = userRating._avg.overallScore ? Number(userRating._avg.overallScore.toFixed(1)) : 0;
    const achievementRate = endedShiftsPeriodCount > 0
      ? Math.min(100, Math.round((reportsPeriodCount / endedShiftsPeriodCount) * 100))
      : (ratingVal ? Math.round((ratingVal / 5) * 100) : 100);

    const data = {
      period,
      stats: {
        today: {
          hours: Number(hoursToday.toFixed(1)),
          orders: dailyReportsToday._sum.totalOrders || 0,
          fuel: fuelToday._sum.amount || 0,
        },
        weekly: {
          hours: Number((dailyReportsWeek._sum.totalHours || 0).toFixed(1)),
          orders: dailyReportsWeek._sum.totalOrders || 0,
        },
        monthly: {
          hours: Number((dailyReportsMonth._sum.totalHours || 0).toFixed(1)),
          orders: dailyReportsMonth._sum.totalOrders || 0,
        },
        period: {
          hours: Number((dailyReportsPeriod._sum.totalHours || 0).toFixed(1)),
          orders: dailyReportsPeriod._sum.totalOrders || 0,
          shiftsCount: shiftsPeriodCount,
          violationsCount: violationsPeriodCount,
          fuelLogsCount: fuelLogsPeriodCount,
          achievementRate,
        },
        rating: ratingVal,
        shiftsCount: shiftsPeriodCount,
        violationsCount: violationsPeriodCount,
        fuelLogsCount: fuelLogsPeriodCount,
        achievementRate,
      },
      profile: {
        city: userProfile?.city?.nameAr || null,
      },
      tasks,
      currentShift,
      recentReports,
    };

    return ApiResponse.success(res, data, 'Driver dashboard loaded');
  } catch (err) { next(err); }
});

/**
 * REST fallback for live map — active shifts with last known coordinates.
 * Mobile keeps using socket driver_location_update; dashboard can poll this if needed.
 */
router.get('/live-tracking', ...adminPerm(...DASHBOARD_VIEW_PERMISSIONS), async (req, res, next) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: {
        status: 'ACTIVE',
        lastLat: { not: null },
        lastLng: { not: null },
      },
      select: {
        id: true,
        lastLat: true,
        lastLng: true,
        lastLocationAt: true,
        startedAt: true,
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true } },
        vehicle: { select: { id: true, plateNumber: true, model: true } },
      },
      orderBy: { lastLocationAt: 'desc' },
      take: 200,
    });

    const data = shifts.map((s) => ({
      shiftId: s.id,
      lat: s.lastLat ? Number(s.lastLat) : null,
      lng: s.lastLng ? Number(s.lastLng) : null,
      timestamp: s.lastLocationAt?.toISOString() || null,
      driver: s.user,
      vehicle: s.vehicle,
    }));

    return ApiResponse.success(res, data, 'Live tracking loaded');
  } catch (err) { next(err); }
});

module.exports = router;
