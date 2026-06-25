const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError, ValidationError } = require('../../utils/errors');
const { parseCsv, rowsToCsv } = require('../../utils/csvParser');

function parseReportDate(input) {
  if (!input) throw new ValidationError('reportDate is required');
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

class FinancialLedgerService {
  static async computeAutoRows(reportDate) {
    const date = parseReportDate(reportDate);
    const { start, end } = dayRange(date);

    const drivers = await prisma.user.findMany({
      where: { deletedAt: null, userType: 'APP_USER', appUser: { appRole: 'DRIVER' } },
      select: { id: true, fullNameAr: true, identityNumber: true },
    });
    const ids = drivers.map((d) => d.id);

    const [penalties, violations, rewards, advances] = await Promise.all([
      prisma.penalty.findMany({
        where: { userId: { in: ids }, status: 'APPLIED', penaltyDate: { gte: start, lt: end } },
      }),
      prisma.violation.findMany({
        where: { userId: { in: ids }, violationDate: { gte: start, lt: end }, status: { in: ['CONFIRMED', 'PENALIZED'] } },
      }),
      prisma.reward.findMany({
        where: { userId: { in: ids }, status: 'APPROVED', createdAt: { gte: start, lt: end } },
      }),
      prisma.salaryAdvance.findMany({
        where: { userId: { in: ids }, status: 'APPROVED', createdAt: { gte: start, lt: end } },
      }),
    ]);

    const byUser = new Map();
    const ensure = (userId) => {
      if (!byUser.has(userId)) {
        const user = drivers.find((d) => d.id === userId);
        byUser.set(userId, {
          userId,
          user,
          deductionsAmount: 0,
          deductionsNote: null,
          violationsAmount: 0,
          violationsNote: null,
          trafficAmount: 0,
          trafficNote: null,
          rewardsAmount: 0,
          advancesAmount: 0,
        });
      }
      return byUser.get(userId);
    };

    penalties.forEach((p) => {
      const row = ensure(p.userId);
      row.deductionsAmount += Number(p.amount || 0);
      row.deductionsNote = [row.deductionsNote, p.reason].filter(Boolean).join(' | ');
    });
    violations.forEach((v) => {
      const row = ensure(v.userId);
      const amt = Number(v.amount || 0);
      const isTraffic = /مرور|رخصة|traffic/i.test(v.reason || '');
      if (isTraffic) {
        row.trafficAmount += amt;
        row.trafficNote = [row.trafficNote, v.reason].filter(Boolean).join(' | ');
      } else {
        row.violationsAmount += amt;
        row.violationsNote = [row.violationsNote, v.reason].filter(Boolean).join(' | ');
      }
    });
    rewards.forEach((r) => {
      const row = ensure(r.userId);
      row.rewardsAmount += Number(r.amount || 0);
    });
    advances.forEach((a) => {
      const row = ensure(a.userId);
      row.advancesAmount += Number(a.amount || 0);
    });

    return [...byUser.values()].filter((r) =>
      r.deductionsAmount || r.violationsAmount || r.trafficAmount || r.rewardsAmount || r.advancesAmount,
    );
  }

  static async getBundle(query) {
    const date = parseReportDate(query.reportDate || new Date().toISOString().slice(0, 10));
    const autoRows = await FinancialLedgerService.computeAutoRows(date);

    let ledger = await prisma.dailyFinancialLedger.findUnique({
      where: { reportDate: date },
      include: {
        rows: {
          include: {
            user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          },
        },
      },
    });

    const merged = autoRows.map((auto) => {
      const manual = ledger?.rows?.find((r) => r.userId === auto.userId);
      if (!manual) return { ...auto, isManual: false };
      return {
        userId: auto.userId,
        user: manual.user || auto.user,
        deductionsAmount: manual.deductionsAmount ?? auto.deductionsAmount,
        deductionsNote: manual.deductionsNote ?? auto.deductionsNote,
        violationsAmount: manual.violationsAmount ?? auto.violationsAmount,
        violationsNote: manual.violationsNote ?? auto.violationsNote,
        trafficAmount: manual.trafficAmount ?? auto.trafficAmount,
        trafficNote: manual.trafficNote ?? auto.trafficNote,
        rewardsAmount: manual.rewardsAmount ?? auto.rewardsAmount,
        advancesAmount: manual.advancesAmount ?? auto.advancesAmount,
        isManual: manual.isManual,
      };
    });

    ledger?.rows?.forEach((manual) => {
      if (!merged.find((r) => r.userId === manual.userId)) {
        merged.push({
          userId: manual.userId,
          user: manual.user,
          deductionsAmount: manual.deductionsAmount,
          deductionsNote: manual.deductionsNote,
          violationsAmount: manual.violationsAmount,
          violationsNote: manual.violationsNote,
          trafficAmount: manual.trafficAmount,
          trafficNote: manual.trafficNote,
          rewardsAmount: manual.rewardsAmount,
          advancesAmount: manual.advancesAmount,
          isManual: true,
        });
      }
    });

    return {
      reportDate: date.toISOString().slice(0, 10),
      ledgerId: ledger?.id || null,
      status: ledger?.status || 'DRAFT',
      rows: merged.sort((a, b) => (a.user?.fullNameAr || '').localeCompare(b.user?.fullNameAr || '', 'ar')),
    };
  }

  static async generateSnapshot(reportDate, userId) {
    const date = parseReportDate(reportDate);
    const autoRows = await FinancialLedgerService.computeAutoRows(date);
    const ledger = await prisma.dailyFinancialLedger.upsert({
      where: { reportDate: date },
      create: { reportDate: date, status: 'DRAFT' },
      update: { status: 'DRAFT' },
    });
    await prisma.financialLedgerRow.deleteMany({ where: { ledgerId: ledger.id, isManual: false } });
    if (autoRows.length) {
      await prisma.financialLedgerRow.createMany({
        data: autoRows.map((r) => ({
          ledgerId: ledger.id,
          userId: r.userId,
          deductionsAmount: r.deductionsAmount || null,
          deductionsNote: r.deductionsNote,
          violationsAmount: r.violationsAmount || null,
          violationsNote: r.violationsNote,
          trafficAmount: r.trafficAmount || null,
          trafficNote: r.trafficNote,
          rewardsAmount: r.rewardsAmount || null,
          advancesAmount: r.advancesAmount || null,
          isManual: false,
        })),
      });
    }
    return FinancialLedgerService.getBundle({ reportDate: date.toISOString().slice(0, 10) });
  }

  static async importCsv(reportDate, buffer) {
    const date = parseReportDate(reportDate);
    const rows = parseCsv(buffer.toString('utf8'));
    const ledger = await prisma.dailyFinancialLedger.upsert({
      where: { reportDate: date },
      create: { reportDate: date },
      update: {},
    });
    let imported = 0;
    for (const row of rows) {
      const identity = row.identityNumber?.trim();
      if (!identity) continue;
      const user = await prisma.user.findFirst({ where: { identityNumber: identity }, select: { id: true } });
      if (!user) continue;
      const ded = parseAmountExpr(row.deductions ?? row.deductions_note);
      const vio = parseAmountExpr(row.violations ?? row.violations_note);
      const trf = parseAmountExpr(row.traffic ?? row.traffic_note);
      await prisma.financialLedgerRow.upsert({
        where: { ledgerId_userId: { ledgerId: ledger.id, userId: user.id } },
        create: {
          ledgerId: ledger.id,
          userId: user.id,
          deductionsAmount: ded.amount,
          deductionsNote: row.deductions_note || ded.note,
          violationsAmount: vio.amount,
          violationsNote: row.violations_note || vio.note,
          trafficAmount: trf.amount,
          trafficNote: row.traffic_note || trf.note,
          rewardsAmount: row.rewards ? parseFloat(row.rewards) : null,
          advancesAmount: row.advances ? parseFloat(row.advances) : null,
          isManual: true,
        },
        update: {
          deductionsAmount: ded.amount,
          deductionsNote: row.deductions_note || ded.note,
          violationsAmount: vio.amount,
          violationsNote: row.violations_note || vio.note,
          trafficAmount: trf.amount,
          trafficNote: row.traffic_note || trf.note,
          rewardsAmount: row.rewards ? parseFloat(row.rewards) : null,
          advancesAmount: row.advances ? parseFloat(row.advances) : null,
          isManual: true,
        },
      });
      imported += 1;
    }
    return { imported, bundle: await FinancialLedgerService.getBundle({ reportDate: date.toISOString().slice(0, 10) }) };
  }

  static exportCsv(bundle) {
    const columns = [
      { key: 'identityNumber', label: 'identityNumber', get: (r) => r.user?.identityNumber },
      { key: 'fullNameAr', label: 'fullNameAr', get: (r) => r.user?.fullNameAr },
      { key: 'deductions', label: 'deductions', get: (r) => r.deductionsAmount },
      { key: 'deductions_note', label: 'deductions_note', get: (r) => r.deductionsNote },
      { key: 'violations', label: 'violations', get: (r) => r.violationsAmount },
      { key: 'violations_note', label: 'violations_note', get: (r) => r.violationsNote },
      { key: 'traffic', label: 'traffic', get: (r) => r.trafficAmount },
      { key: 'traffic_note', label: 'traffic_note', get: (r) => r.trafficNote },
      { key: 'rewards', label: 'rewards', get: (r) => r.rewardsAmount },
      { key: 'advances', label: 'advances', get: (r) => r.advancesAmount },
    ];
    return rowsToCsv(bundle.rows || [], columns);
  }

  static templateCsv() {
    return rowsToCsv([], [
      { key: 'identityNumber', label: 'identityNumber' },
      { key: 'fullNameAr', label: 'fullNameAr' },
      { key: 'deductions', label: 'deductions' },
      { key: 'deductions_note', label: 'deductions_note' },
      { key: 'violations', label: 'violations' },
      { key: 'violations_note', label: 'violations_note' },
      { key: 'traffic', label: 'traffic' },
      { key: 'traffic_note', label: 'traffic_note' },
      { key: 'rewards', label: 'rewards' },
      { key: 'advances', label: 'advances' },
    ]);
  }
}

module.exports = FinancialLedgerService;
