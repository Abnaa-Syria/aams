const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class DailyReportService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.status && { status: query.status }),
    };

    // Scoping logic (Drivers see only theirs, Supervisors see their team)
    if (currentUser.role === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.role === 'SUPERVISOR') {
      where.user = { supervisorId: currentUser.id };
    }

    if (query.dateFrom || query.dateTo) {
      where.reportDate = {};
      if (query.dateFrom) where.reportDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.reportDate.lte = new Date(query.dateTo);
    }

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

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
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

    // Access control
    if (currentUser.role === 'DRIVER' && report.userId !== currentUser.id) {
      throw new NotFoundError('Daily Report');
    }

    return report;
  }

  static async create(userId, data, files = []) {
    const reportDate = new Date(data.reportDate || Date.now());
    reportDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // 1. Check if a report already exists for this user on this day
    const existing = await prisma.dailyReport.findFirst({
      where: { userId, reportDate },
    });
    if (existing) throw new BusinessLogicError('A report already exists for this date');

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
        shiftId: data.shiftId ? parseInt(data.shiftId) : undefined,
        reportDate,
        totalHours: data.totalHours ? parseFloat(data.totalHours) : undefined,
        totalOrders: data.totalOrders ? parseInt(data.totalOrders) : undefined,
        notes: data.notes,
        status: 'SUBMITTED',
        appBreakdowns: {
          create: appBreakdowns.map(b => ({
            platformName: b.platformName,
            orders: b.orders ? parseInt(b.orders) : undefined,
            hours: b.hours ? parseFloat(b.hours) : undefined,
            earnings: b.earnings ? parseFloat(b.earnings) : undefined,
          })),
        },
        screenshots: {
          create: files.map(f => ({
            fileUrl: normalizeStoredUploadPath(f.path),
            fileName: f.originalname,
          })),
        },
      },
      include: { appBreakdowns: true, screenshots: true },
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
