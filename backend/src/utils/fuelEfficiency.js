const prisma = require('../config/database');

const DEFAULT_LITERS_PER_100 = 10;
const DEFAULT_VARIANCE_PERCENT = 25;

async function getFuelPolicy() {
  const keys = ['FUEL_LITERS_PER_100KM', 'FUEL_VARIANCE_THRESHOLD_PERCENT'];
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true, labelAr: true, descriptionAr: true },
  });
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s]));

  const litersPer100 = parseFloat(byKey.FUEL_LITERS_PER_100KM?.value) || DEFAULT_LITERS_PER_100;
  const varianceThresholdPercent = parseFloat(byKey.FUEL_VARIANCE_THRESHOLD_PERCENT?.value) || DEFAULT_VARIANCE_PERCENT;

  return {
    litersPer100Km: litersPer100,
    varianceThresholdPercent,
    labelAr: byKey.FUEL_LITERS_PER_100KM?.labelAr || 'استهلاك الوقود المتوقع (لتر/100كم)',
    descriptionAr: byKey.FUEL_LITERS_PER_100KM?.descriptionAr
      || 'المعيار المعتمد: كل 100 كم يستهلك المركبة هذا القدر من اللترات تقريباً',
  };
}

async function computeFuelEfficiency({ vehicleId, userId, dateFrom, dateTo, status = 'APPROVED' }) {
  const policy = await getFuelPolicy();

  const fuelWhere = { status };
  if (vehicleId) fuelWhere.vehicleId = parseInt(vehicleId, 10);
  if (userId) fuelWhere.userId = parseInt(userId, 10);
  if (dateFrom || dateTo) {
    fuelWhere.fuelDate = {};
    if (dateFrom) fuelWhere.fuelDate.gte = new Date(dateFrom);
    if (dateTo) fuelWhere.fuelDate.lte = new Date(dateTo);
  }

  const fuelAgg = await prisma.fuelLog.aggregate({
    where: fuelWhere,
    _sum: { liters: true },
  });

  const shiftWhere = { status: 'ENDED', startOdometer: { not: null }, endOdometer: { not: null } };
  if (vehicleId) shiftWhere.vehicleId = parseInt(vehicleId, 10);
  if (userId) shiftWhere.userId = parseInt(userId, 10);
  if (dateFrom || dateTo) {
    shiftWhere.endedAt = {};
    if (dateFrom) shiftWhere.endedAt.gte = new Date(dateFrom);
    if (dateTo) shiftWhere.endedAt.lte = new Date(dateTo);
  }

  const shifts = await prisma.shift.findMany({
    where: shiftWhere,
    select: { startOdometer: true, endOdometer: true },
  });

  const totalKm = shifts.reduce(
    (sum, s) => sum + Math.max(0, (s.endOdometer || 0) - (s.startOdometer || 0)),
    0,
  );
  const actualLiters = Number(fuelAgg._sum.liters || 0);
  const expectedLiters = totalKm > 0 ? (totalKm / 100) * policy.litersPer100Km : 0;
  const varianceLiters = Number((actualLiters - expectedLiters).toFixed(2));
  const variancePercent = expectedLiters > 0
    ? Number(((varianceLiters / expectedLiters) * 100).toFixed(1))
    : null;

  const overThreshold = variancePercent != null
    && variancePercent > policy.varianceThresholdPercent;

  return {
    ...policy,
    totalKm,
    actualLiters,
    expectedLiters: Number(expectedLiters.toFixed(2)),
    varianceLiters,
    variancePercent,
    overThreshold,
    actualPer100Km: totalKm > 0 ? Number(((actualLiters / totalKm) * 100).toFixed(2)) : null,
  };
}

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function evaluateFuelSuspicion({
  userId,
  vehicleId,
  liters,
  file,
  vehicle,
  fuelDate = new Date(),
}) {
  const flags = [];
  let status = 'PENDING';

  const mark = (msg) => {
    flags.push(msg);
    status = 'FLAGGED';
  };

  if (liters && vehicle?.tankCapacity && liters > Number(vehicle.tankCapacity)) {
    mark(`اللترات (${liters}) تتجاوز سعة الخزان (${vehicle.tankCapacity} لتر)`);
  }

  if (!file) {
    mark('بدون إيصال تعبئة');
  }

  const recent = await prisma.fuelLog.findFirst({
    where: {
      userId,
      vehicleId,
      createdAt: { gte: new Date(Date.now() - 15 * 60000) },
    },
  });
  if (recent) {
    mark('تعبئة مكررة خلال 15 دقيقة');
  }

  const { start, end } = dayBounds(new Date(fuelDate));
  const sameDayCount = await prisma.fuelLog.count({
    where: {
      userId,
      vehicleId,
      fuelDate: { gte: start, lt: end },
    },
  });
  if (sameDayCount >= 1) {
    mark('تعبئة ثانية لنفس المركبة في نفس اليوم');
  }

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const efficiency = await computeFuelEfficiency({
    vehicleId,
    userId,
    dateFrom: monthAgo.toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    status: 'APPROVED',
  });

  if (efficiency.totalKm > 0 && efficiency.overThreshold) {
    mark(
      `استهلاك أعلى من المعيار: فعلي ${efficiency.actualPer100Km} لتر/100كم `
      + `(المعيار ${efficiency.litersPer100Km} لتر/100كم، تجاوز ${efficiency.variancePercent}%)`,
    );
  }

  return {
    status,
    reviewNotes: flags.length ? flags.join(' | ') : '',
    isDuplicate: !!recent,
    efficiency,
  };
}

module.exports = {
  getFuelPolicy,
  computeFuelEfficiency,
  evaluateFuelSuspicion,
  DEFAULT_LITERS_PER_100,
  DEFAULT_VARIANCE_PERCENT,
};
