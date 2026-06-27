const prisma = require('../config/database');

const STATUS_LABELS_AR = {
  DEPLOYED: 'نازل الميدان',
  ON_LEAVE: 'إجازة',
  SICK: 'مرضي',
  LICENSE_FOLLOWUP: 'متابعة دلة',
  PERMISSION: 'استئذان',
  NOT_DEPLOYED: 'غير نازل',
  ABSENT: 'غائب',
};

function parseDay(input) {
  const raw = input instanceof Date ? input.toISOString().slice(0, 10) : String(input).slice(0, 10);
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

function dayRange(reportDate) {
  const start = parseDay(reportDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function dateKey(d) {
  return (d instanceof Date ? d : parseDay(d)).toISOString().slice(0, 10);
}

function eachDayInclusive(startDate, endDate) {
  const days = [];
  let cur = parseDay(startDate);
  const end = parseDay(endDate);
  while (cur <= end) {
    days.push(new Date(cur));
    cur = new Date(cur);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function sumOrders(platformOrders = {}) {
  return Object.values(platformOrders).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

function classifyDriverDay({
  driver,
  orders = {},
  hasShift = false,
  onLeave = null,
  sick = null,
  license = null,
  permission = null,
}) {
  if (onLeave) {
    return { status: 'ON_LEAVE', statusLabel: STATUS_LABELS_AR.ON_LEAVE, notes: onLeave };
  }
  if (sick) {
    return { status: 'SICK', statusLabel: STATUS_LABELS_AR.SICK, notes: sick };
  }
  if (license) {
    return { status: 'LICENSE_FOLLOWUP', statusLabel: STATUS_LABELS_AR.LICENSE_FOLLOWUP, notes: license };
  }
  if (permission) {
    return { status: 'PERMISSION', statusLabel: STATUS_LABELS_AR.PERMISSION, notes: permission };
  }

  const total = sumOrders(orders);
  if (total > 0 || hasShift) {
    return {
      status: 'DEPLOYED',
      statusLabel: STATUS_LABELS_AR.DEPLOYED,
      notes: null,
      totalOrders: total,
      platformOrders: orders,
    };
  }

  const employmentStatus = driver.appUser?.employmentStatus || driver.employmentStatus;
  if (employmentStatus === 'ON_DUTY') {
    return {
      status: 'NOT_DEPLOYED',
      statusLabel: STATUS_LABELS_AR.NOT_DEPLOYED,
      notes: 'على رأس العمل — بدون شفت/طلبات',
      totalOrders: 0,
    };
  }

  return {
    status: 'ABSENT',
    statusLabel: STATUS_LABELS_AR.ABSENT,
    notes: 'لا شفت ولا تقرير يومي',
    totalOrders: 0,
  };
}

async function loadDrivers(cityId, userId) {
  const where = {
    deletedAt: null,
    userType: 'APP_USER',
    appUser: { appRole: 'DRIVER' },
  };
  if (cityId) where.cityId = parseInt(cityId, 10);
  if (userId) where.id = parseInt(userId, 10);

  return prisma.user.findMany({
    where,
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

async function loadRangeData(driverIds, rangeStart, rangeEnd) {
  return Promise.all([
    prisma.dailyReport.findMany({
      where: {
        userId: { in: driverIds },
        status: 'APPROVED',
        reportDate: { gte: rangeStart, lt: rangeEnd },
      },
      include: { appBreakdowns: true },
    }),
    prisma.shift.findMany({
      where: {
        userId: { in: driverIds },
        OR: [
          { startedAt: { gte: rangeStart, lt: rangeEnd } },
          { endedAt: { gte: rangeStart, lt: rangeEnd } },
          { status: 'ACTIVE', startedAt: { lt: rangeEnd }, OR: [{ endedAt: null }, { endedAt: { gte: rangeStart } }] },
          { requestedAt: { gte: rangeStart, lt: rangeEnd } },
        ],
      },
      select: {
        id: true, userId: true, status: true, startedAt: true, endedAt: true,
        requestedAt: true, requestedStartTime: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: driverIds },
        status: 'APPROVED',
        startDate: { lt: rangeEnd },
        endDate: { gte: rangeStart },
      },
      select: { userId: true, leaveType: true, reason: true, startDate: true, endDate: true },
    }),
    prisma.licenseTest.findMany({
      where: {
        userId: { in: driverIds },
        OR: [
          { result: null },
          { isRetest: true, result: null },
          { testDate: { gte: rangeStart, lt: rangeEnd } },
        ],
      },
      select: { userId: true, isRetest: true, notes: true, testDate: true, result: true },
    }),
    prisma.permissionRequest.findMany({
      where: {
        userId: { in: driverIds },
        status: 'APPROVED',
        permissionDate: { gte: rangeStart, lt: rangeEnd },
      },
      select: { userId: true, reason: true, permissionDate: true, startTime: true, endTime: true },
    }),
    prisma.platform.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, nameAr: true },
    }),
  ]);
}

function buildDayIndexes(dailyReports, shifts, leaves, licenseTests, permissions, platforms) {
  const ordersByUserDay = new Map();
  dailyReports.forEach((r) => {
    const key = `${r.userId}:${dateKey(r.reportDate)}`;
    const orders = {};
    platforms.forEach((p) => { orders[p.nameAr] = 0; });
    (r.appBreakdowns || []).forEach((b) => {
      const k = String(b.platformName || '').trim();
      if (k) orders[k] = (orders[k] || 0) + (Number(b.orders) || 0);
    });
    ordersByUserDay.set(key, orders);
  });

  const shiftByUserDay = new Set();
  shifts.forEach((s) => {
    if (s.status !== 'ACTIVE' && s.status !== 'ENDED') return;
    const day = s.startedAt ? dateKey(s.startedAt) : (s.requestedAt ? dateKey(s.requestedAt) : null);
    if (day) shiftByUserDay.add(`${s.userId}:${day}`);
  });

  const leaveByUserDay = new Map();
  leaves.filter((l) => l.leaveType !== 'SICK').forEach((l) => {
    eachDayInclusive(l.startDate, l.endDate).forEach((d) => {
      leaveByUserDay.set(`${l.userId}:${dateKey(d)}`, l.reason || 'إجازة');
    });
  });

  const sickByUserDay = new Map();
  leaves.filter((l) => l.leaveType === 'SICK').forEach((l) => {
    eachDayInclusive(l.startDate, l.endDate).forEach((d) => {
      sickByUserDay.set(`${l.userId}:${dateKey(d)}`, l.reason || 'مرضي');
    });
  });

  const licenseByUserDay = new Map();
  licenseTests.forEach((lt) => {
    if (lt.result) return;
    const day = lt.testDate ? dateKey(lt.testDate) : null;
    if (!day) return;
    const note = lt.isRetest ? 'إعادة اختبار' : (lt.notes || 'متابعة رخصة');
    licenseByUserDay.set(`${lt.userId}:${day}`, note);
  });

  const permissionByUserDay = new Map();
  permissions.forEach((p) => {
    const day = dateKey(p.permissionDate);
    const time = [p.startTime, p.endTime].filter(Boolean).join(' - ');
    const note = time ? `${p.reason || 'استئذان'} (${time})` : (p.reason || 'استئذان');
    permissionByUserDay.set(`${p.userId}:${day}`, note);
  });

  return {
    ordersByUserDay, shiftByUserDay, leaveByUserDay, sickByUserDay, licenseByUserDay, permissionByUserDay,
  };
}

function classifyDriverOnDay(driver, day, indexes) {
  const dk = dateKey(day);
  const key = `${driver.id}:${dk}`;
  return classifyDriverDay({
    driver,
    orders: indexes.ordersByUserDay.get(key) || {},
    hasShift: indexes.shiftByUserDay.has(key),
    onLeave: indexes.leaveByUserDay.get(key) || null,
    sick: indexes.sickByUserDay.get(key) || null,
    license: indexes.licenseByUserDay.get(key) || null,
    permission: indexes.permissionByUserDay.get(key) || null,
  });
}

async function computePeriodAttendance({ dateFrom, dateTo, cityId = null, userId = null }) {
  const rangeStart = parseDay(dateFrom);
  const rangeEnd = new Date(parseDay(dateTo));
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const drivers = await loadDrivers(cityId, userId);
  const driverIds = drivers.map((d) => d.id);
  const days = eachDayInclusive(dateFrom, dateTo);

  const [dailyReports, shifts, leaves, licenseTests, permissions, platforms] = await loadRangeData(
    driverIds, rangeStart, rangeEnd,
  );
  const indexes = buildDayIndexes(dailyReports, shifts, leaves, licenseTests, permissions, platforms);

  const rows = [];
  const summaryByStatus = {};

  drivers.forEach((driver) => {
    days.forEach((day) => {
      const classification = classifyDriverOnDay(driver, day, indexes);
      summaryByStatus[classification.status] = (summaryByStatus[classification.status] || 0) + 1;
      rows.push({
        date: dateKey(day),
        userId: driver.id,
        identityNumber: driver.identityNumber,
        fullNameAr: driver.fullNameAr,
        branch: driver.city?.nameAr || null,
        ...classification,
      });
    });
  });

  const driverSummaries = drivers.map((driver) => {
    const driverRows = rows.filter((r) => r.userId === driver.id);
    const counts = {};
    driverRows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return {
      userId: driver.id,
      fullNameAr: driver.fullNameAr,
      identityNumber: driver.identityNumber,
      branch: driver.city?.nameAr || null,
      daysTotal: driverRows.length,
      counts,
      deployedDays: counts.DEPLOYED || 0,
      absentDays: counts.ABSENT || 0,
      leaveDays: counts.ON_LEAVE || 0,
      sickDays: counts.SICK || 0,
      permissionDays: counts.PERMISSION || 0,
      notDeployedDays: counts.NOT_DEPLOYED || 0,
    };
  });

  return {
    dateFrom: dateKey(dateFrom),
    dateTo: dateKey(dateTo),
    cityId: cityId ? parseInt(cityId, 10) : null,
    days: days.length,
    drivers: drivers.length,
    summaryByStatus,
    driverSummaries,
    rows,
  };
}

const TARDY_THRESHOLD_MINUTES = 15;

function computeTardiness(shifts, dateFrom, dateTo) {
  const rangeStart = parseDay(dateFrom);
  const rangeEnd = new Date(parseDay(dateTo));
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const items = [];
  shifts.forEach((shift) => {
    if (!shift.startedAt) return;
    const started = new Date(shift.startedAt);
    if (started < rangeStart || started >= rangeEnd) return;

    if (shift.requestedStartTime) {
      const requested = new Date(shift.requestedStartTime);
      const delayMin = Math.round((started - requested) / 60000);
      if (delayMin > TARDY_THRESHOLD_MINUTES) {
        items.push({
          type: 'LATE_START',
          userId: shift.userId,
          shiftId: shift.id,
          date: dateKey(started),
          delayMinutes: delayMin,
          notes: `تأخر ${delayMin} دقيقة عن الموعد`,
        });
      }
    }
  });

  return items;
}

module.exports = {
  STATUS_LABELS_AR,
  parseDay,
  dayRange,
  dateKey,
  eachDayInclusive,
  classifyDriverDay,
  classifyDriverOnDay,
  loadDrivers,
  loadRangeData,
  buildDayIndexes,
  computePeriodAttendance,
  computeTardiness,
};
