const ReportService = require('./service');
const AdvancedReportService = require('./advancedService');
const ApiResponse = require('../../utils/response');
const { sendExportResponse } = require('../../utils/xlsxWorkbook');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

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
      await assertCanAccessDriverRecord(req, parseInt(userId, 10));
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

  static async getDashboardOverview(req, res, next) {
    try {
      const overview = await ReportService.getDashboardOverview();
      return ApiResponse.success(res, overview, 'Dashboard overview retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async getAttendancePeriod(req, res, next) {
    try {
      const { dateFrom, dateTo, cityId, userId } = req.query;
      if (userId) await assertCanAccessDriverRecord(req, parseInt(userId, 10));
      const data = await require('../../utils/attendanceClassifier').computePeriodAttendance({
        dateFrom, dateTo, cityId, userId,
      });
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getDriverDossier(req, res, next) {
    try {
      const { userId } = req.params;
      await assertCanAccessDriverRecord(req, parseInt(userId, 10));
      const data = await AdvancedReportService.getDriverDossier({
        userId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      });
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async exportDriverDossier(req, res, next) {
    try {
      const { userId } = req.params;
      await assertCanAccessDriverRecord(req, parseInt(userId, 10));
      const result = await AdvancedReportService.exportDriverDossier({
        userId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      });
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async unifiedSearch(req, res, next) {
    try {
      const data = await AdvancedReportService.unifiedSearch({
        q: req.query.q,
        type: req.query.type,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      });
      if (data.found && data.dossier?.user?.id) {
        await assertCanAccessDriverRecord(req, data.dossier.user.id);
      }
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async getAbsenceReport(req, res, next) {
    try {
      const { dateFrom, dateTo, cityId, userId } = req.query;
      if (userId) await assertCanAccessDriverRecord(req, parseInt(userId, 10));
      const data = await AdvancedReportService.getAbsenceReport({
        dateFrom, dateTo, cityId, userId,
      });
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async exportAbsenceReport(req, res, next) {
    try {
      const result = await AdvancedReportService.exportAbsenceReport(req.query);
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
