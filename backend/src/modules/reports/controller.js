const ReportService = require('./service');
const ApiResponse = require('../../utils/response');

class ReportController {
  /**
   * Generates a composite summary for a specific driver.
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  static async getDriverSummary(req, res, next) {
    try {
      const { userId } = req.params;
      let { startDate, endDate } = req.query;

      // Fallback to the last 30 days if dates are not provided
      if (!startDate || !endDate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        startDate = startDate || thirtyDaysAgo.toISOString();
        endDate = endDate || new Date().toISOString();
      }

      const summary = await ReportService.getDriverCompositeSummary({
        userId,
        startDate,
        endDate
      });

      return ApiResponse.success(res, summary, 'Driver composite summary retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
