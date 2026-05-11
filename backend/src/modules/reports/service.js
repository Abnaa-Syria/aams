const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

class ReportService {
  /**
   * Generates an advanced composite summary for a specific driver within a date range.
   * Runs queries concurrently for optimized performance.
   * 
   * @param {Object} params
   * @param {number|string} params.userId - The ID of the driver.
   * @param {Date|string} params.startDate - The start date of the reporting period.
   * @param {Date|string} params.endDate - The end date of the reporting period.
   * @returns {Promise<Object>} Aggregated dashboard data for the driver.
   */
  static async getDriverCompositeSummary({ userId, startDate, endDate }) {
    const id = parseInt(userId, 10);
    
    // Validate user existence
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullNameAr: true,
        fullNameEn: true,
        identityNumber: true,
        mobileNumber: true,
        employmentStatus: true,
        accountStatus: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new NotFoundError('Driver');
    }

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Run independent aggregation queries concurrently
    const [
      shiftsCount,
      salaryAdvances,
      adminRequests,
      violationsCount,
      activeAssets,
      rewards,
      penalties
    ] = await Promise.all([
      // 2. Total count of Shifts
      prisma.shift.count({
        where: { userId: id, createdAt: dateFilter }
      }),
      // 3. Total sum of SalaryAdvance amounts approved
      prisma.salaryAdvance.aggregate({
        _sum: { amount: true },
        where: { userId: id, status: 'APPROVED', createdAt: dateFilter }
      }),
      // 4. Total count of AdminRequests
      prisma.adminRequest.count({
        where: { userId: id, createdAt: dateFilter }
      }),
      // 5. Total count of Violations recorded
      prisma.violation.count({
        where: { userId: id, createdAt: dateFilter }
      }),
      // 6. Current active AssetAssignments (not strictly date-bound)
      prisma.assetAssignment.findMany({
        where: { userId: id, status: 'ASSIGNED' },
        include: { asset: { select: { nameAr: true, type: true } } }
      }),
      // Bonuses (Rewards)
      prisma.reward.aggregate({
        _sum: { amount: true },
        where: { userId: id, status: 'APPROVED', createdAt: dateFilter }
      }),
      // Deductions (Penalties)
      prisma.penalty.aggregate({
        _sum: { amount: true },
        where: { userId: id, status: 'APPLIED', createdAt: dateFilter }
      })
    ]);

    return {
      driver: user,
      period: {
        startDate,
        endDate
      },
      metrics: {
        totalShifts: shiftsCount,
        approvedSalaryAdvancesSum: salaryAdvances._sum.amount ? parseFloat(salaryAdvances._sum.amount) : 0,
        adminRequestsCount: adminRequests,
        approvedBonusesSum: rewards._sum.amount ? parseFloat(rewards._sum.amount) : 0,
        appliedDeductionsSum: penalties._sum.amount ? parseFloat(penalties._sum.amount) : 0,
        recordedViolationsCount: violationsCount,
      },
      activeAssets
    };
  }

  static async getDashboardOverview() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      platformStats,
      fleetStatus,
      driverStatus,
      financials,
      expiringCounts,
      incidentsByType,
      activeShifts,
      penaltyStats,
      financialRequests,
      adminHrRequests,
      performanceStats
    ] = await Promise.all([
      // 1. Platform Performance
      prisma.reportAppBreakdown.groupBy({
        by: ['platformName'],
        _sum: { orders: true },
      }),
      // 2. Fleet Status
      prisma.vehicle.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null }
      }),
      // 3. Driver Status
      prisma.user.groupBy({
        by: ['employmentStatus'],
        _count: { id: true },
        where: { userType: 'APP_USER', appUser: { appRole: 'DRIVER' }, deletedAt: null }
      }),
      // 4. Financial Sums
      Promise.all([
        prisma.fuelLog.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } }),
        prisma.penalty.aggregate({ _sum: { amount: true }, where: { status: 'APPLIED' } }),
        prisma.salaryAdvance.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } })
      ]),
      // 5. Expiring Docs
      Promise.all([
        prisma.license.count({ where: { expiryDate: { lte: thirtyDaysFromNow, gte: now }, status: { not: 'EXPIRED' } } }),
        prisma.document.count({ where: { expiryDate: { lte: thirtyDaysFromNow, gte: now }, status: { not: 'EXPIRED' } } })
      ]),
      // 6. Incidents
      prisma.incident.groupBy({ by: ['type'], _count: { id: true } }),
      // 7. Live Ops
      prisma.shift.count({ where: { status: 'ACTIVE' } }),
      // 8. Penalties Summary
      prisma.penalty.groupBy({
        by: ['type'],
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'APPLIED' }
      }),
      // 9. Pending Financial Requests
      Promise.all([
        prisma.salaryAdvance.count({ where: { status: 'PENDING' } }),
        prisma.maintenanceRequest.count({ where: { status: 'REQUESTED' } })
      ]),
      // 10. Admin & HR Requests
      Promise.all([
        prisma.adminRequest.count({ where: { status: 'PENDING' } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } })
      ]),
      // 11. Performance & Violations
      Promise.all([
        prisma.violation.count(),
        prisma.rating.aggregate({ _avg: { overallScore: true } }),
        prisma.reward.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } })
      ])
    ]);

    const fuelSum = parseFloat(financials[0]._sum.amount || 0);
    const penaltySum = parseFloat(financials[1]._sum.amount || 0);
    const advanceSum = parseFloat(financials[2]._sum.amount || 0);
    const rewardSum = parseFloat(performanceStats[2]._sum.amount || 0);

    return {
      platformPerformance: platformStats.map(ps => ({
        platform: ps.platformName,
        orders: ps._sum.orders || 0
      })).sort((a, b) => b.orders - a.orders),
      fleetStatus: fleetStatus.map(fs => ({
        status: fs.status,
        count: fs._count.id
      })),
      driverStatus: driverStatus.map(ds => ({
        status: ds.employmentStatus,
        count: ds._count.id
      })),
      financials: {
        fuel: fuelSum,
        penalties: penaltySum,
        advances: advanceSum,
        rewards: rewardSum,
        totalExpenses: fuelSum + advanceSum + rewardSum, // Penalties are income/deductions
      },
      alerts: {
        expiringLicenses: expiringCounts[0],
        expiringDocuments: expiringCounts[1],
        totalExpiring: expiringCounts[0] + expiringCounts[1]
      },
      incidents: incidentsByType.map(i => ({ type: i.type, count: i._count.id })),
      liveOps: { activeShifts },
      penaltiesSummary: penaltyStats.map(p => ({
        type: p.type,
        amount: parseFloat(p._sum.amount || 0),
        count: p._count.id
      })),
      pendingRequests: {
        salaryAdvances: financialRequests[0],
        maintenance: financialRequests[1],
        adminRequests: adminHrRequests[0],
        leaveRequests: adminHrRequests[1]
      },
      performance: {
        totalViolations: performanceStats[0],
        averageRating: parseFloat(performanceStats[1]._avg.overallScore || 0)
      },
      totalOrders: platformStats.reduce((acc, curr) => acc + (curr._sum.orders || 0), 0)
    };
  }
}

module.exports = ReportService;
