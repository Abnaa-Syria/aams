const prisma = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const {
  computePeriodAttendance,
  computeTardiness,
  loadRangeData,
  parseDay,
  dateKey,
  STATUS_LABELS_AR,
} = require('../../utils/attendanceClassifier');
const { exportMultiSheet } = require('../../utils/xlsxWorkbook');

const TARDY_MINUTES = 15;

class AdvancedReportService {
  static async resolveUserFromQuery(q, type) {
    const query = String(q || '').trim();
    if (!query) throw new ValidationError('أدخل قيمة البحث');

    if (type === 'plate' || (!type && /^[A-Za-z\u0600-\u06FF0-9-]{3,}$/.test(query) && /[A-Za-z\u0600-\u06FF]/.test(query) && /\d/.test(query))) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { plateNumber: { contains: query }, deletedAt: null },
        include: {
          assignments: {
            where: { isActive: true, releasedAt: null },
            take: 1,
            include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
          },
        },
      });
      if (vehicle?.assignments?.[0]?.user) {
        return { user: vehicle.assignments[0].user, matchType: 'plate', matchValue: query, vehicle };
      }
    }

    if (type === '700' || (!type && /^\d{7,12}$/.test(query))) {
      const by700 = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { sevenHundredNumber: query },
            { appUser: { sevenHundredNumber: query } },
          ],
        },
        select: { id: true, fullNameAr: true, identityNumber: true },
      });
      if (by700) return { user: by700, matchType: '700', matchValue: query };
    }

    if (type === 'identity' || /^\d{10}$/.test(query)) {
      const user = await prisma.user.findUnique({
        where: { identityNumber: query },
        select: { id: true, fullNameAr: true, identityNumber: true },
      });
      if (user) return { user, matchType: 'identity', matchValue: query };
    }

    const byName = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        userType: 'APP_USER',
        appUser: { appRole: 'DRIVER' },
        fullNameAr: { contains: query },
      },
      select: { id: true, fullNameAr: true, identityNumber: true },
      orderBy: { fullNameAr: 'asc' },
    });
    if (byName) return { user: byName, matchType: 'name', matchValue: query };

    return null;
  }

  static defaultDateRange(dateFrom, dateTo) {
    const end = dateTo ? parseDay(dateTo) : new Date();
    const start = dateFrom ? parseDay(dateFrom) : new Date(end);
    if (!dateFrom) start.setUTCDate(start.getUTCDate() - 30);
    return { dateFrom: dateKey(start), dateTo: dateKey(end) };
  }

  static async getDriverDossier({ userId, dateFrom, dateTo }) {
    const id = parseInt(userId, 10);
    const range = AdvancedReportService.defaultDateRange(dateFrom, dateTo);
    const rangeStart = parseDay(range.dateFrom);
    const rangeEnd = new Date(parseDay(range.dateTo));
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullNameAr: true, fullNameEn: true, identityNumber: true,
        mobileNumber: true, employeeNumber: true, city: { select: { nameAr: true } },
        appUser: {
          select: {
            employmentStatus: true, availabilityStatus: true,
            sevenHundredNumber: true, roomNumber: true,
            supervisor: { select: { user: { select: { fullNameAr: true } } } },
          },
        },
      },
    });
    if (!user) throw new NotFoundError('Driver');

    const attendance = await computePeriodAttendance({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      userId: id,
    });

    const [
      shifts, dailyReports, leaves, permissions, violations, rewards, penalties, advances,
    ] = await Promise.all([
      prisma.shift.findMany({
        where: { userId: id, requestedAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { requestedAt: 'desc' },
        take: 100,
        include: {
          vehicle: { select: { plateNumber: true } },
          platformAccount: { include: { platform: { select: { nameAr: true } } } },
        },
      }),
      prisma.dailyReport.findMany({
        where: { userId: id, reportDate: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { reportDate: 'desc' },
        include: { appBreakdowns: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: id,
          startDate: { lt: rangeEnd },
          endDate: { gte: rangeStart },
        },
        orderBy: { startDate: 'desc' },
      }),
      prisma.permissionRequest.findMany({
        where: { userId: id, permissionDate: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { permissionDate: 'desc' },
      }),
      prisma.violation.findMany({
        where: { userId: id, createdAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.reward.findMany({
        where: { userId: id, createdAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.penalty.findMany({
        where: { userId: id, createdAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.salaryAdvance.findMany({
        where: { userId: id, createdAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const tardiness = computeTardiness(shifts, range.dateFrom, range.dateTo);

    return {
      user,
      period: range,
      attendanceSummary: attendance.driverSummaries[0] || null,
      attendanceDays: attendance.rows,
      shifts,
      dailyReports,
      leaves,
      permissions,
      violations,
      rewards,
      penalties,
      salaryAdvances: advances,
      tardiness,
    };
  }

  static async exportDriverDossier({ userId, dateFrom, dateTo }) {
    const dossier = await AdvancedReportService.getDriverDossier({ userId, dateFrom, dateTo });
    const name = dossier.user.fullNameAr || `driver-${userId}`;

    const sheets = [
      {
        name: 'ملخص الحضور',
        columns: [
          { key: 'date', label: 'date', labelAr: 'التاريخ' },
          { key: 'statusLabel', label: 'statusLabel', labelAr: 'الحالة' },
          { key: 'notes', label: 'notes', labelAr: 'ملاحظات' },
          { key: 'totalOrders', label: 'totalOrders', labelAr: 'الطلبات' },
        ],
        rows: dossier.attendanceDays.map((r) => ({
          date: r.date,
          statusLabel: r.statusLabel,
          notes: r.notes || '',
          totalOrders: r.totalOrders ?? '',
        })),
      },
      {
        name: 'الشفتات',
        columns: [
          { key: 'date', label: 'date', labelAr: 'التاريخ' },
          { key: 'status', label: 'status', labelAr: 'الحالة' },
          { key: 'vehicle', label: 'vehicle', labelAr: 'المركبة' },
          { key: 'platform', label: 'platform', labelAr: 'المنصة' },
        ],
        rows: dossier.shifts.map((s) => ({
          date: s.startedAt ? dateKey(s.startedAt) : dateKey(s.requestedAt),
          status: s.status,
          vehicle: s.vehicle?.plateNumber || '',
          platform: s.platformAccount?.platform?.nameAr || '',
        })),
      },
      {
        name: 'التقارير اليومية',
        columns: [
          { key: 'date', label: 'date', labelAr: 'التاريخ' },
          { key: 'orders', label: 'orders', labelAr: 'الطلبات' },
          { key: 'hours', label: 'hours', labelAr: 'الساعات' },
          { key: 'status', label: 'status', labelAr: 'الحالة' },
        ],
        rows: dossier.dailyReports.map((r) => ({
          date: dateKey(r.reportDate),
          orders: r.totalOrders ?? '',
          hours: r.totalHours ?? '',
          status: r.status,
        })),
      },
      {
        name: 'إجازات واستئذان',
        columns: [
          { key: 'type', label: 'type', labelAr: 'النوع' },
          { key: 'from', label: 'from', labelAr: 'من' },
          { key: 'to', label: 'to', labelAr: 'إلى' },
          { key: 'reason', label: 'reason', labelAr: 'السبب' },
          { key: 'status', label: 'status', labelAr: 'الحالة' },
        ],
        rows: [
          ...dossier.leaves.map((l) => ({
            type: l.leaveType,
            from: dateKey(l.startDate),
            to: dateKey(l.endDate),
            reason: l.reason || '',
            status: l.status,
          })),
          ...dossier.permissions.map((p) => ({
            type: 'استئذان',
            from: dateKey(p.permissionDate),
            to: '',
            reason: p.reason || '',
            status: p.status,
          })),
        ],
      },
      {
        name: 'مالي ومخالفات',
        columns: [
          { key: 'kind', label: 'kind', labelAr: 'النوع' },
          { key: 'date', label: 'date', labelAr: 'التاريخ' },
          { key: 'amount', label: 'amount', labelAr: 'المبلغ' },
          { key: 'status', label: 'status', labelAr: 'الحالة' },
          { key: 'notes', label: 'notes', labelAr: 'ملاحظات' },
        ],
        rows: [
          ...dossier.violations.map((v) => ({
            kind: 'مخالفة', date: dateKey(v.createdAt), amount: v.amount ?? '', status: v.status, notes: v.reason || '',
          })),
          ...dossier.rewards.map((v) => ({
            kind: 'مكافأة', date: dateKey(v.createdAt), amount: v.amount ?? '', status: v.status, notes: v.reason || '',
          })),
          ...dossier.penalties.map((v) => ({
            kind: 'جزاء', date: dateKey(v.createdAt), amount: v.amount ?? '', status: v.status, notes: v.reason || '',
          })),
          ...dossier.salaryAdvances.map((v) => ({
            kind: 'سلفة', date: dateKey(v.createdAt), amount: v.amount ?? '', status: v.status, notes: v.reason || '',
          })),
        ],
      },
    ];

    if (dossier.tardiness.length) {
      sheets.push({
        name: 'تأخيرات',
        columns: [
          { key: 'date', label: 'date', labelAr: 'التاريخ' },
          { key: 'delayMinutes', label: 'delayMinutes', labelAr: 'دقائق التأخير' },
          { key: 'notes', label: 'notes', labelAr: 'ملاحظات' },
        ],
        rows: dossier.tardiness,
      });
    }

    return exportMultiSheet({
      sheets,
      format: 'xlsx',
      filename: `driver-dossier-${dossier.user.identityNumber}-${dossier.period.dateFrom}`,
      title: `ملف السائق — ${name}`,
    });
  }

  static async unifiedSearch({ q, type, dateFrom, dateTo }) {
    const match = await AdvancedReportService.resolveUserFromQuery(q, type);
    if (!match) {
      return { found: false, query: q, type: type || 'auto' };
    }

    const dossier = await AdvancedReportService.getDriverDossier({
      userId: match.user.id,
      dateFrom,
      dateTo,
    });

    return {
      found: true,
      matchType: match.matchType,
      matchValue: match.matchValue,
      vehicle: match.vehicle ? { plateNumber: match.vehicle.plateNumber } : null,
      dossier,
    };
  }

  static async getAbsenceReport({ dateFrom, dateTo, cityId, userId }) {
    if (!dateFrom || !dateTo) throw new ValidationError('dateFrom و dateTo مطلوبان');

    const attendance = await computePeriodAttendance({ dateFrom, dateTo, cityId, userId });
    const rangeStart = parseDay(dateFrom);
    const rangeEnd = new Date(parseDay(dateTo));
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

    const driverIds = attendance.driverSummaries.map((d) => d.userId);
    const [, shifts] = await loadRangeData(driverIds, rangeStart, rangeEnd);
    const tardiness = computeTardiness(shifts, dateFrom, dateTo).map((t) => {
      const driver = attendance.driverSummaries.find((d) => d.userId === t.userId);
      return {
        ...t,
        fullNameAr: driver?.fullNameAr,
        identityNumber: driver?.identityNumber,
        branch: driver?.branch,
      };
    });

    const absences = attendance.rows.filter((r) => ['ABSENT', 'NOT_DEPLOYED'].includes(r.status));
    const permissions = attendance.rows.filter((r) => r.status === 'PERMISSION');
    const leaves = attendance.rows.filter((r) => ['ON_LEAVE', 'SICK'].includes(r.status));

    return {
      dateFrom: attendance.dateFrom,
      dateTo: attendance.dateTo,
      cityId: attendance.cityId,
      summary: {
        ...attendance.summaryByStatus,
        tardinessCount: tardiness.length,
        absenceRows: absences.length,
      },
      driverSummaries: attendance.driverSummaries,
      absences,
      leaves,
      permissions,
      tardiness,
      statusLabels: STATUS_LABELS_AR,
    };
  }

  static async exportAbsenceReport(query) {
    const report = await AdvancedReportService.getAbsenceReport(query);
    return exportMultiSheet({
      sheets: [
        {
          name: 'ملخص السائقين',
          columns: [
            { key: 'fullNameAr', label: 'fullNameAr', labelAr: 'الاسم' },
            { key: 'identityNumber', label: 'identityNumber', labelAr: 'الهوية' },
            { key: 'branch', label: 'branch', labelAr: 'الفرع' },
            { key: 'deployedDays', label: 'deployedDays', labelAr: 'أيام نزول' },
            { key: 'absentDays', label: 'absentDays', labelAr: 'غياب' },
            { key: 'notDeployedDays', label: 'notDeployedDays', labelAr: 'غير نازل' },
            { key: 'leaveDays', label: 'leaveDays', labelAr: 'إجازات' },
            { key: 'permissionDays', label: 'permissionDays', labelAr: 'استئذان' },
          ],
          rows: report.driverSummaries,
        },
        {
          name: 'تفاصيل الغياب',
          columns: [
            { key: 'date', label: 'date', labelAr: 'التاريخ' },
            { key: 'fullNameAr', label: 'fullNameAr', labelAr: 'الاسم' },
            { key: 'statusLabel', label: 'statusLabel', labelAr: 'الحالة' },
            { key: 'notes', label: 'notes', labelAr: 'ملاحظات' },
          ],
          rows: report.absences,
        },
        {
          name: 'تأخيرات',
          columns: [
            { key: 'date', label: 'date', labelAr: 'التاريخ' },
            { key: 'fullNameAr', label: 'fullNameAr', labelAr: 'الاسم' },
            { key: 'delayMinutes', label: 'delayMinutes', labelAr: 'دقائق' },
            { key: 'notes', label: 'notes', labelAr: 'ملاحظات' },
          ],
          rows: report.tardiness,
        },
      ],
      format: 'xlsx',
      filename: `absence-report-${report.dateFrom}-${report.dateTo}`,
      title: 'تقرير الغياب والتأخير',
    });
  }
}

module.exports = AdvancedReportService;
