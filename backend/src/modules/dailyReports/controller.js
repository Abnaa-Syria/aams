const DailyReportService = require('./service');
const ApiResponse = require('../../utils/response');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { collectDailyReportUploadFiles } = require('../../utils/dailyReportUpload');

class DailyReportController {
  static async listReports(req, res, next) {
    try {
      const result = await DailyReportService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getReport(req, res, next) {
    try {
      const report = await DailyReportService.getById(req.params.id);
      await assertCanAccessDriverRecord(req, report.userId);
      return ApiResponse.success(res, report);
    } catch (err) {
      next(err);
    }
  }

  static async createReport(req, res, next) {
    try {
      const report = await DailyReportService.create(req.user, req.body, collectDailyReportUploadFiles(req));
      return ApiResponse.created(res, report, 'Daily report submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reviewReport(req, res, next) {
    try {
      const report = await DailyReportService.review(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, report, 'Daily report reviewed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteReport(req, res, next) {
    try {
      await DailyReportService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Daily report deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DailyReportController;
