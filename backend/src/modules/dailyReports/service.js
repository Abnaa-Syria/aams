const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const { resolvePeriodStartDate } = require('../../utils/periodFilter');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN']);

function findPlatformScreenshotFile(files, platformName) {
  const base = String(platformName || '').trim();
  const candidates = new Set([
    `screenshot_${base}`,
    `screenshot_${base.replace(/\s+/g, '')}`,
    `screenshot_${base.replace(/\s+/g, '_')}`,
  ]);
  return files.find((f) => {
    const field = f.fieldname || '';
    if (candidates.has(field)) return true;
    return field.toLowerCase().startsWith('screenshot_')
      && field.toLowerCase().includes(base.toLowerCase().replace(/\s+/g, ''));
  });
}

class DailyReportService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.status && { status: query.status }),
    };

    // Scoping logic using userId and appRole (Drivers see only theirs, Supervisors see their team)
    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      // If supervisor specifies a userId, it must be one of their drivers
      if (query.userId) {
        where.userId = parseInt(query.userId);
        where.user = { appUser: { supervisorId: currentUser.appUserId } };
      } else {
        where.user = { appUser: { supervisorId: currentUser.appUserId } };
      }
    } else if (query.userId) {
      // Admins and other roles can filter by userId freely
      where.userId = parseInt(query.userId);
    }
    where = mergeAppUserIdFilter(where, query.appUserId);

    if (query.period && !query.dateFrom && !query.dateTo) {
      where.reportDate = { gte: resolvePeriodStartDate(query.period) };
    } else if (query.dateFrom || query.dateTo) {
      where.reportDate = {};
      if (query.dateFrom) where.reportDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.reportDate.lte = new Date(query.dateTo);
    }

    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.dailyReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportDate: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          appBreakdowns: true,
          screenshots: true,
        },
      }),
      prisma.dailyReport.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));


    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const report = await prisma.dailyReport.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true } },
        shift: { select: { id: true, startedAt: true, endedAt: true, startOdometer: true, endOdometer: true } },
        appBreakdowns: true,
        screenshots: true,
      },
    });

    if (!report) throw new NotFoundError('Daily Report');

    let reviewer = null;
    if (report.reviewedBy) {
      const reviewerUser = await prisma.user.findUnique({
        where: { id: report.reviewedBy },
        select: {
          id: true,
          fullNameAr: true,
          fullNameEn: true,
          role: true,
          appUser: { select: { appRole: true } },
        },
      });
      if (reviewerUser) {
        let roleNameAr = 'مشرف';
        if (reviewerUser.role === 'SUPER_ADMIN') {
          roleNameAr = 'مدير النظام';
        } else if (reviewerUser.role === 'OPERATIONS_ADMIN') {
          roleNameAr = 'مشرف العمليات';
        } else if (reviewerUser.role === 'HR_ADMIN') {
          roleNameAr = 'مشرف الموارد البشرية';
        } else if (reviewerUser.role === 'FLEET_ADMIN') {
          roleNameAr = 'مشرف الأسطول';
        } else if (reviewerUser.role === 'FINANCE_ADMIN') {
          roleNameAr = 'مشرف المالية';
        } else if (reviewerUser.appUser?.appRole === 'SUPERVISOR') {
          roleNameAr = 'مشرف الفريق';
        }

        reviewer = {
          id: reviewerUser.id,
          fullNameAr: reviewerUser.fullNameAr,
          fullNameEn: reviewerUser.fullNameEn,
          role: reviewerUser.role,
          appRole: reviewerUser.appUser?.appRole || null,
          roleNameAr,
        };
      }
    }

    // Calculate weekly and monthly summaries relative to the report's date
    const reportDate = new Date(report.reportDate);
    
    // Weekly: last 7 days ending on reportDate
    const weekStart = new Date(reportDate);
    weekStart.setDate(weekStart.getDate() - 7);
    
    // Monthly: start of month of reportDate
    const monthStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);

    const [weeklySummary, monthlySummary] = await Promise.all([
      prisma.dailyReport.aggregate({
        where: {
          userId: report.userId,
          reportDate: {
            gte: weekStart,
            lte: reportDate,
          },
          status: { not: 'REJECTED' },
        },
        _sum: { totalHours: true, totalOrders: true },
      }),
      prisma.dailyReport.aggregate({
        where: {
          userId: report.userId,
          reportDate: {
            gte: monthStart,
            lte: reportDate,
          },
          status: { not: 'REJECTED' },
        },
        _sum: { totalHours: true, totalOrders: true },
      }),
    ]);

    const weeklyHours = weeklySummary._sum.totalHours ? Number(Number(weeklySummary._sum.totalHours).toFixed(1)) : 0;
    const weeklyOrders = weeklySummary._sum.totalOrders || 0;
    
    const monthlyHours = monthlySummary._sum.totalHours ? Number(Number(monthlySummary._sum.totalHours).toFixed(1)) : 0;
    const monthlyOrders = monthlySummary._sum.totalOrders || 0;

    return {
      ...report,
      appUser: report.user ? { user: report.user } : null,
      reviewer,
      weeklySummary: {
        hours: weeklyHours,
        orders: weeklyOrders,
      },
      monthlySummary: {
        hours: monthlyHours,
        orders: monthlyOrders,
      },
    };
  }

  static resolveTargetUserId(currentUser, data) {
    if (currentUser.appRole === 'DRIVER') {
      if (data.userId && parseInt(data.userId, 10) !== currentUser.id) {
        throw new BusinessLogicError('لا يمكنك إنشاء تقرير لسائق آخر');
      }
      return currentUser.id;
    }

    const targetId = parseInt(data.userId, 10);
    if (!targetId) throw new BusinessLogicError('يجب اختيار السائق');
    return targetId;
  }

  static async create(currentUser, data, files = []) {
    const userId = DailyReportService.resolveTargetUserId(currentUser, data);
    await assertCanAccessDriverRecord(currentUser, userId);

    const reportDate = new Date(data.reportDate || Date.now());
    reportDate.setHours(0, 0, 0, 0);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { appUser: true },
    });
    if (!user) throw new NotFoundError('User');
    if (user.appUser?.appRole !== 'DRIVER') {
      throw new BusinessLogicError('التقرير اليومي للسائقين فقط');
    }

    const { ensureActiveShift } = require('../../utils/shiftSecurity');
    let resolvedShiftId = data.shiftId ? parseInt(data.shiftId, 10) : null;

    if (!resolvedShiftId) {
      if (currentUser.appRole === 'DRIVER') {
        const activeShift = await ensureActiveShift(currentUser, false);
        resolvedShiftId = activeShift?.id ?? null;
      } else {
        const activeShift = await prisma.shift.findFirst({
          where: { userId, status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
        });
        resolvedShiftId = activeShift?.id ?? null;
      }
    } else if (!ADMIN_ROLES.has(currentUser.role)) {
      const shift = await prisma.shift.findFirst({
        where: { id: resolvedShiftId, userId, status: 'ACTIVE' },
      });
      if (!shift) {
        throw new BusinessLogicError('الشفت المحدد غير نشط أو لا يخص هذا السائق');
      }
    }

    // 1. Check if a report already exists for this shift or this date
    if (resolvedShiftId) {
      const existingForShift = await prisma.dailyReport.findFirst({
        where: { shiftId: resolvedShiftId },
      });
      if (existingForShift) throw new BusinessLogicError('A report already exists for this shift');
    } else {
      const existing = await prisma.dailyReport.findFirst({
        where: { userId, reportDate },
      });
      if (existing) throw new BusinessLogicError('A report already exists for this date');
    }

    // 2. Validate App Breakdowns (if provided)
    let appBreakdowns = [];
    if (data.appBreakdowns) {
      appBreakdowns = typeof data.appBreakdowns === 'string' ? JSON.parse(data.appBreakdowns) : data.appBreakdowns;
      
      const sumOrders = appBreakdowns.reduce((sum, b) => sum + (parseInt(b.orders) || 0), 0);
      if (data.totalOrders && parseInt(data.totalOrders) !== sumOrders) {
        throw new BusinessLogicError(`Total orders (${data.totalOrders}) does not match sum of app breakdowns (${sumOrders})`);
      }
    }

    // 3. Create the report
    const report = await prisma.dailyReport.create({
      data: {
        userId,
        appUserId: user.appUser?.id || null, // Set appUserId for operational queries
        shiftId: resolvedShiftId,
        reportDate,
        totalHours: data.totalHours ? parseFloat(data.totalHours) : undefined,
        totalOrders: data.totalOrders ? parseInt(data.totalOrders) : undefined,
        notes: data.notes,
        status: 'SUBMITTED',
        appBreakdowns: {
          create: appBreakdowns.map(b => {
            const platformFile = findPlatformScreenshotFile(files, b.platformName);
            return {
              platformName: b.platformName,
              orders: b.orders ? parseInt(b.orders) : undefined,
              hours: b.hours ? parseFloat(b.hours) : undefined,
              earnings: b.earnings ? parseFloat(b.earnings) : undefined,
              screenshotUrl: platformFile ? normalizeStoredUploadPath(platformFile.path) : undefined,
            };
          }),
        },
        screenshots: {
          create: files.map(f => ({
            fileUrl: normalizeStoredUploadPath(f.path),
            fileName: f.originalname,
          })),
        },
      },
      include: {
        appBreakdowns: true,
        screenshots: true,
        user: { select: { id: true, fullNameAr: true, identityNumber: true } },
      },
    });

    return report;
  }

  static async review(id, adminId, { status, reviewNotes }) {
    const report = await prisma.dailyReport.findUnique({ where: { id: parseInt(id) } });
    if (!report) throw new NotFoundError('Daily Report');

    const updated = await prisma.dailyReport.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

    await logAudit({
      userId: adminId,
      action: 'REVIEW_DAILY_REPORT',
      entity: 'DailyReport',
      entityId: String(id),
      newValue: { status },
    });

    return updated;
  }

  static async delete(id, adminId) {
    const report = await prisma.dailyReport.findUnique({ where: { id: parseInt(id) } });
    if (!report) throw new NotFoundError('Daily Report');

    // Transaction to ensure all related data is deleted
    await prisma.$transaction([
      prisma.reportScreenshot.deleteMany({ where: { reportId: parseInt(id) } }),
      prisma.reportAppBreakdown.deleteMany({ where: { reportId: parseInt(id) } }),
      prisma.dailyReport.delete({ where: { id: parseInt(id) } }),
    ]);

    await logAudit({
      userId: adminId,
      action: 'DELETE_DAILY_REPORT',
      entity: 'DailyReport',
      entityId: String(id),
    });

    return true;
  }
}

module.exports = DailyReportService;
