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
}

module.exports = ReportService;
