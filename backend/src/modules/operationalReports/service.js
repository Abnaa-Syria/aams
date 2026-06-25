const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError, ValidationError } = require('../../utils/errors');
const { parseCsv, rowsToCsv } = require('../../utils/csvParser');

const SIDE_CATEGORIES = [
  'ON_LEAVE', 'ABSENT', 'SICK', 'LICENSE_FOLLOWUP',
  'MANAGEMENT', 'OPERATIONS_DEPT', 'MECHANICS', 'BOX_MANUFACTURING', 'EXTERNAL_WORK', 'NOT_DEPLOYED', 'CUSTOM',
];

const CATEGORY_LABELS = {
  DEPLOYED: 'نزول الميدان',
  ON_LEAVE: 'الإجازات',
  ABSENT: 'الغيابات',
  SICK: 'المرضى',
  LICENSE_FOLLOWUP: 'متابعة دلة',
  MANAGEMENT: 'الإدارة',
  OPERATIONS_DEPT: 'قسم التشغيل',
  MECHANICS: 'الميكانيك',
  BOX_MANUFACTURING: 'تصنيع صناديق',
  EXTERNAL_WORK: 'أعمال خارج الشركة',
  NOT_DEPLOYED: 'غير نازل',
  CUSTOM: 'أخرى',
};

function parseReportDate(input) {
  if (!input) throw new ValidationError('reportDate is required (YYYY-MM-DD)');
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new ValidationError('Invalid reportDate');
    return input;
  }
  const raw = String(input).trim();
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new ValidationError('Invalid reportDate');
  return d;
}

function dayRange(reportDate) {
  const start = new Date(reportDate);
  const end = new Date(reportDate);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function normalizePlatformKey(name) {
  return String(name || '').trim();
}

function sumOrders(platformOrders = {}) {
  return Object.values(platformOrders).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

function parseAmountExpr(raw) {
  if (raw == null || raw === '') return { amount: null, note: null };
  const s = String(raw).trim();
  if (!s) return { amount: null, note: null };
  const parts = s.split('+').map((p) => p.trim()).filter(Boolean);
  let total = 0;
  let hasNum = false;
  for (const p of parts) {
    const n = parseFloat(p.replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(n)) { total += n; hasNum = true; }
  }
  if (!hasNum) return { amount: null, note: s };
  return { amount: total, note: s !== String(total) ? s : null };
}

class OperationalReportService {
  static getCategoryLabels() {
    return CATEGORY_LABELS;
  }

  static async getActivePlatforms() {
    return prisma.platform.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, nameAr: true, nameEn: true },
    });
  }

  static async getBranchDefaultTarget(cityId) {
    if (!cityId) return null;
    const city = await prisma.city.findUnique({ where: { id: parseInt(cityId, 10) } });
    if (!city) return null;
    const key = `report.branchTarget.${city.nameAr}`;
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (setting?.value) return parseInt(setting.value, 10) || null;
    return null;
  }

  static driverWhere(cityId) {
    const where = {
      deletedAt: null,
      userType: 'APP_USER',
      appUser: { appRole: 'DRIVER' },
    };
    if (cityId) where.cityId = parseInt(cityId, 10);
    return where;
  }

  static async loadDrivers(cityId) {
    return prisma.user.findMany({
      where: OperationalReportService.driverWhere(cityId),
      select: {
        id: true,
        fullNameAr: true,
        identityNumber: true,
        employeeNumber: true,
        cityId: true,
        city: { select: { id: true, nameAr: true } },
        appUser: { select: { employmentStatus: true, availabilityStatus: true } },
      },
      orderBy: { fullNameAr: 'asc' },
    });
  }

  static async computeAutoBundle(reportDate, cityId = null) {
    const { start, end } = dayRange(reportDate);
    const platforms = await OperationalReportService.getActivePlatforms();
    const drivers = await OperationalReportService.loadDrivers(cityId);
    const driverIds = drivers.map((d) => d.id);

    const [dailyReports, shifts, leaves, licenseTests] = await Promise.all([
      prisma.dailyReport.findMany({
        where: {
          userId: { in: driverIds },
          status: 'APPROVED',
          reportDate: { gte: start, lt: end },
        },
        include: { appBreakdowns: true },
      }),
      prisma.shift.findMany({
        where: {
          userId: { in: driverIds },
          OR: [
            { status: 'ACTIVE', startedAt: { lt: end }, OR: [{ endedAt: null }, { endedAt: { gte: start } }] },
            { startedAt: { gte: start, lt: end } },
            { endedAt: { gte: start, lt: end } },
          ],
        },
        select: { userId: true, status: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: { in: driverIds },
          status: 'APPROVED',
          startDate: { lt: end },
          endDate: { gte: start },
        },
        select: { userId: true, leaveType: true, reason: true },
      }),
      prisma.licenseTest.findMany({
        where: {
          userId: { in: driverIds },
          OR: [
            { result: null },
            { isRetest: true, result: null },
            { testDate: { gte: start, lt: end } },
          ],
        },
        select: { userId: true, isRetest: true, notes: true, testDate: true, result: true },
      }),
    ]);

    const reportsByUser = new Map();
    dailyReports.forEach((r) => {
      const orders = {};
      platforms.forEach((p) => { orders[p.nameAr] = 0; });
      (r.appBreakdowns || []).forEach((b) => {
        const key = normalizePlatformKey(b.platformName);
        if (!key) return;
        orders[key] = (orders[key] || 0) + (Number(b.orders) || 0);
      });
      reportsByUser.set(r.userId, orders);
    });

    const onShiftUsers = new Set(shifts.filter((s) => s.status === 'ACTIVE').map((s) => s.userId));
    const onLeaveUsers = new Map();
    leaves.forEach((l) => {
      if (l.leaveType === 'SICK') return;
      onLeaveUsers.set(l.userId, l.reason || 'إجازة');
    });
    const sickUsers = new Map();
    leaves.filter((l) => l.leaveType === 'SICK').forEach((l) => {
      sickUsers.set(l.userId, l.reason || 'مرضي');
    });
    const licenseUsers = new Map();
    licenseTests.forEach((lt) => {
      if (lt.result) return;
      const note = lt.isRetest ? 'إعادة اختبار' : (lt.notes || 'متابعة رخصة');
      licenseUsers.set(lt.userId, note);
    });

    const deployed = [];
    const notDeployed = [];
    const absent = [];

    drivers.forEach((driver) => {
      const orders = reportsByUser.get(driver.id) || {};
      platforms.forEach((p) => {
        if (orders[p.nameAr] === undefined) orders[p.nameAr] = 0;
      });
      const total = sumOrders(orders);
      const hasShift = onShiftUsers.has(driver.id);
      const onLeave = onLeaveUsers.has(driver.id);
      const sick = sickUsers.has(driver.id);

      if (onLeave || sick || licenseUsers.has(driver.id)) return;

      if (total > 0 || hasShift) {
        deployed.push({
          userId: driver.id,
          user: driver,
          category: 'DEPLOYED',
          platformOrders: orders,
          notes: null,
          totalOrders: total,
        });
      } else if (driver.appUser?.employmentStatus === 'ON_DUTY') {
        notDeployed.push({
          userId: driver.id,
          user: driver,
          category: 'NOT_DEPLOYED',
          platformOrders: orders,
          notes: 'على رأس العمل — بدون شفت/طلبات',
          totalOrders: 0,
        });
      } else {
        absent.push({
          userId: driver.id,
          user: driver,
          category: 'ABSENT',
          platformOrders: null,
          notes: 'لا شفت ولا تقرير يومي',
          totalOrders: 0,
        });
      }
    });

    const sections = {
      DEPLOYED: deployed,
      ON_LEAVE: [...onLeaveUsers.entries()].map(([userId, notes]) => ({
        userId,
        user: drivers.find((d) => d.id === userId),
        category: 'ON_LEAVE',
        platformOrders: null,
        notes,
      })),
      SICK: [...sickUsers.entries()].map(([userId, notes]) => ({
        userId,
        user: drivers.find((d) => d.id === userId),
        category: 'SICK',
        platformOrders: null,
        notes,
      })),
      LICENSE_FOLLOWUP: [...licenseUsers.entries()].map(([userId, notes]) => ({
        userId,
        user: drivers.find((d) => d.id === userId),
        category: 'LICENSE_FOLLOWUP',
        platformOrders: null,
        notes,
      })),
      ABSENT: absent,
      NOT_DEPLOYED: notDeployed,
      MANAGEMENT: [],
      OPERATIONS_DEPT: [],
      MECHANICS: [],
      BOX_MANUFACTURING: [],
      EXTERNAL_WORK: [],
      CUSTOM: [],
    };

    const achievedOrders = deployed.reduce((acc, r) => acc + r.totalOrders, 0);
    const defaultTarget = await OperationalReportService.getBranchDefaultTarget(cityId);

    return {
      reportDate: reportDate.toISOString().slice(0, 10),
      cityId: cityId ? parseInt(cityId, 10) : null,
      platforms,
      sections,
      summary: {
        deployedCount: deployed.length,
        notDeployedCount: notDeployed.length,
        onLeaveCount: sections.ON_LEAVE.length,
        absentCount: absent.length,
        sickCount: sections.SICK.length,
        licenseFollowUpCount: sections.LICENSE_FOLLOWUP.length,
        fieldTotal: deployed.length + notDeployed.length,
        achievedOrders,
        requiredOrders: defaultTarget,
        achievedOrdersDisplay: null,
        requiredOrdersDisplay: null,
        difference: defaultTarget != null ? achievedOrders - defaultTarget : null,
      },
    };
  }

  static mergeManualRows(autoBundle, savedRows = []) {
    const merged = JSON.parse(JSON.stringify(autoBundle));
    savedRows.forEach((row) => {
      const cat = row.category;
      if (!merged.sections[cat]) merged.sections[cat] = [];
      const base = {
        userId: row.userId,
        user: row.user,
        category: cat,
        platformOrders: row.platformOrders || null,
        notes: row.notes,
        isManual: row.isManual,
        totalOrders: row.platformOrders ? sumOrders(row.platformOrders) : 0,
      };
      const idx = merged.sections[cat].findIndex((r) => r.userId === row.userId);
      if (idx >= 0) merged.sections[cat][idx] = { ...merged.sections[cat][idx], ...base };
      else merged.sections[cat].push(base);
    });
    if (merged.sections.DEPLOYED) {
      merged.summary.achievedOrders = merged.sections.DEPLOYED.reduce(
        (acc, r) => acc + (r.totalOrders || sumOrders(r.platformOrders)),
        0,
      );
    }
    return merged;
  }

  static async findOrCreateReport(reportDate, cityId, userId) {
    const date = parseReportDate(reportDate);
    const cid = cityId ? parseInt(cityId, 10) : null;
    let report = await prisma.dailyOperationalReport.findFirst({
      where: { reportDate: date, cityId: cid },
      include: {
        rows: {
          include: {
            user: {
              select: {
                id: true, fullNameAr: true, identityNumber: true, employeeNumber: true,
                city: { select: { nameAr: true } },
              },
            },
          },
        },
        city: { select: { id: true, nameAr: true } },
      },
    });
    if (!report) {
      const auto = await OperationalReportService.computeAutoBundle(date, cid);
      report = await prisma.dailyOperationalReport.create({
        data: {
          reportDate: date,
          cityId: cid,
          status: 'DRAFT',
          requiredOrders: auto.summary.requiredOrders,
          achievedOrders: auto.summary.achievedOrders,
          generatedBy: userId || null,
        },
        include: {
          rows: { include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } } },
          city: { select: { id: true, nameAr: true } },
        },
      });
    }
    return report;
  }

  static applySummaryToBundle(bundle, report) {
    const required = report.requiredOrdersManual ?? report.requiredOrders ?? bundle.summary.requiredOrders;
    const achieved = report.achievedOrdersManual ?? report.achievedOrders ?? bundle.summary.achievedOrders;
    bundle.reportId = report.id;
    bundle.status = report.status;
    bundle.summary = {
      ...bundle.summary,
      requiredOrders: report.requiredOrders,
      achievedOrders: report.achievedOrders,
      requiredOrdersDisplay: required,
      achievedOrdersDisplay: achieved,
      requiredOrdersManual: report.requiredOrdersManual,
      achievedOrdersManual: report.achievedOrdersManual,
      difference: required != null ? achieved - required : null,
      summaryNotes: report.summaryNotes,
    };
    return bundle;
  }

  static async getBundle(query) {
    const date = parseReportDate(query.reportDate || new Date().toISOString().slice(0, 10));
    const cityId = query.cityId ? parseInt(query.cityId, 10) : null;

    const auto = await OperationalReportService.computeAutoBundle(date, cityId);
    const report = await prisma.dailyOperationalReport.findFirst({
      where: { reportDate: date, cityId },
      include: {
        rows: {
          include: {
            user: {
              select: {
                id: true, fullNameAr: true, identityNumber: true, employeeNumber: true,
                city: { select: { nameAr: true } },
              },
            },
          },
        },
        city: { select: { id: true, nameAr: true } },
      },
    });

    let bundle = auto;
    if (report?.rows?.length) {
      bundle = OperationalReportService.mergeManualRows(auto, report.rows);
    }
    if (report) bundle = OperationalReportService.applySummaryToBundle(bundle, report);

    const cities = await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { nameAr: 'asc' },
      select: { id: true, nameAr: true },
    });

    return {
      ...bundle,
      cities,
      categoryLabels: CATEGORY_LABELS,
    };
  }

  static async generateSnapshot(reportDate, cityId, userId) {
    const date = parseReportDate(reportDate);
    const cid = cityId ? parseInt(cityId, 10) : null;
    const auto = await OperationalReportService.computeAutoBundle(date, cid);

    const existingReport = await prisma.dailyOperationalReport.findFirst({
      where: { reportDate: date, cityId: cid },
    });

    const report = existingReport
      ? await prisma.dailyOperationalReport.update({
          where: { id: existingReport.id },
          data: {
            achievedOrders: auto.summary.achievedOrders,
            requiredOrders: auto.summary.requiredOrders ?? undefined,
            generatedBy: userId,
            status: 'DRAFT',
          },
        })
      : await prisma.dailyOperationalReport.create({
          data: {
            reportDate: date,
            cityId: cid,
            status: 'DRAFT',
            requiredOrders: auto.summary.requiredOrders,
            achievedOrders: auto.summary.achievedOrders,
            generatedBy: userId,
          },
        });

    await prisma.operationalReportRow.deleteMany({ where: { reportId: report.id, isManual: false } });

    const rowData = [];
    Object.entries(auto.sections).forEach(([category, rows]) => {
      rows.forEach((r, idx) => {
        rowData.push({
          reportId: report.id,
          userId: r.userId,
          category,
          platformOrders: r.platformOrders || undefined,
          notes: r.notes,
          sortOrder: idx,
          isManual: false,
        });
      });
    });

    if (rowData.length) {
      await prisma.operationalReportRow.createMany({ data: rowData });
    }

    return OperationalReportService.getBundle({ reportDate: date.toISOString().slice(0, 10), cityId: cid });
  }

  static async updateSummary(reportId, body, userId) {
    const id = parseInt(reportId, 10);
    const existing = await prisma.dailyOperationalReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Operational Report');
    if (existing.status === 'FINALIZED') throw new BusinessLogicError('Cannot edit finalized report');

    const updated = await prisma.dailyOperationalReport.update({
      where: { id },
      data: {
        ...(body.requiredOrdersManual !== undefined && { requiredOrdersManual: body.requiredOrdersManual === '' ? null : parseInt(body.requiredOrdersManual, 10) }),
        ...(body.achievedOrdersManual !== undefined && { achievedOrdersManual: body.achievedOrdersManual === '' ? null : parseInt(body.achievedOrdersManual, 10) }),
        ...(body.summaryNotes !== undefined && { summaryNotes: body.summaryNotes }),
      },
    });

    return OperationalReportService.getBundle({
      reportDate: updated.reportDate.toISOString().slice(0, 10),
      cityId: updated.cityId,
    });
  }

  static async finalize(reportId, userId) {
    const id = parseInt(reportId, 10);
    const existing = await prisma.dailyOperationalReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Operational Report');
    await prisma.dailyOperationalReport.update({
      where: { id },
      data: { status: 'FINALIZED', finalizedBy: userId, finalizedAt: new Date() },
    });
    return OperationalReportService.getBundle({
      reportDate: existing.reportDate.toISOString().slice(0, 10),
      cityId: existing.cityId,
    });
  }

  static async importSectionCsv(reportDate, cityId, category, buffer, userId) {
    const date = parseReportDate(reportDate);
    const cid = cityId ? parseInt(cityId, 10) : null;
    const cat = String(category || 'DEPLOYED').toUpperCase();
    if (!CATEGORY_LABELS[cat]) throw new ValidationError('Invalid category');

    const platforms = await OperationalReportService.getActivePlatforms();
    const rows = parseCsv(buffer.toString('utf8'));
    const report = await OperationalReportService.findOrCreateReport(date, cid, userId);

    let imported = 0;
    for (const row of rows) {
      const identity = row.identityNumber?.trim();
      if (!identity) continue;
      const user = await prisma.user.findFirst({
        where: { identityNumber: identity, deletedAt: null },
        select: { id: true },
      });
      if (!user) continue;

      let platformOrders = null;
      if (cat === 'DEPLOYED') {
        platformOrders = {};
        platforms.forEach((p) => {
          const col = row[`orders_${p.nameAr}`] ?? row[p.nameAr] ?? row[`orders_${p.nameEn}`];
          platformOrders[p.nameAr] = parseInt(col, 10) || 0;
        });
      }

      const existingRow = await prisma.operationalReportRow.findFirst({
        where: { reportId: report.id, userId: user.id, category: cat },
      });
      if (existingRow) {
        await prisma.operationalReportRow.update({
          where: { id: existingRow.id },
          data: {
            platformOrders: platformOrders || undefined,
            notes: row.notes || null,
            isManual: true,
          },
        });
      } else {
        await prisma.operationalReportRow.create({
          data: {
            reportId: report.id,
            userId: user.id,
            category: cat,
            platformOrders: platformOrders || undefined,
            notes: row.notes || null,
            isManual: true,
          },
        });
      }
      imported += 1;
    }

    return { imported, bundle: await OperationalReportService.getBundle({ reportDate: date.toISOString().slice(0, 10), cityId: cid }) };
  }

  static async exportSectionCsv(reportDate, cityId, category) {
    const bundle = await OperationalReportService.getBundle({ reportDate, cityId });
    const cat = String(category || 'DEPLOYED').toUpperCase();
    const section = bundle.sections[cat] || [];
    const platforms = bundle.platforms || [];

    if (cat === 'DEPLOYED') {
      const columns = [
        { key: 'identityNumber', label: 'identityNumber', get: (r) => r.user?.identityNumber },
        { key: 'fullNameAr', label: 'fullNameAr', get: (r) => r.user?.fullNameAr },
        { key: 'branch', label: 'branch', get: (r) => r.user?.city?.nameAr },
        ...platforms.map((p) => ({
          key: p.nameAr,
          label: `orders_${p.nameAr}`,
          get: (r) => r.platformOrders?.[p.nameAr] ?? 0,
        })),
        { key: 'notes', label: 'notes', get: (r) => r.notes },
      ];
      return rowsToCsv(section, columns);
    }

    const columns = [
      { key: 'identityNumber', label: 'identityNumber', get: (r) => r.user?.identityNumber },
      { key: 'fullNameAr', label: 'fullNameAr', get: (r) => r.user?.fullNameAr },
      { key: 'notes', label: 'notes', get: (r) => r.notes },
    ];
    return rowsToCsv(section, columns);
  }

  static async templateCsv(category) {
    const cat = String(category || 'DEPLOYED').toUpperCase();
    if (cat === 'DEPLOYED') {
      const platforms = await OperationalReportService.getActivePlatforms();
      return rowsToCsv([], [
        { key: 'identityNumber', label: 'identityNumber' },
        { key: 'fullNameAr', label: 'fullNameAr' },
        { key: 'branch', label: 'branch' },
        ...platforms.map((p) => ({ key: `orders_${p.nameAr}`, label: `orders_${p.nameAr}` })),
        { key: 'notes', label: 'notes' },
      ]);
    }
    return rowsToCsv([], [
      { key: 'identityNumber', label: 'identityNumber' },
      { key: 'fullNameAr', label: 'fullNameAr' },
      { key: 'notes', label: 'notes' },
    ]);
  }
}

module.exports = OperationalReportService;
