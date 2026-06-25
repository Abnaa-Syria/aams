const OperationalReportService = require('./service');
const ApiResponse = require('../../utils/response');

class OperationalReportController {
  static async getBundle(req, res, next) {
    try {
      const data = await OperationalReportService.getBundle(req.query);
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async generate(req, res, next) {
    try {
      const { reportDate, cityId } = req.body;
      const data = await OperationalReportService.generateSnapshot(reportDate, cityId, req.user.id);
      return ApiResponse.success(res, data, 'Report snapshot generated');
    } catch (err) {
      next(err);
    }
  }

  static async updateSummary(req, res, next) {
    try {
      const data = await OperationalReportService.updateSummary(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, data, 'Summary updated');
    } catch (err) {
      next(err);
    }
  }

  static async finalize(req, res, next) {
    try {
      const data = await OperationalReportService.finalize(req.params.id, req.user.id);
      return ApiResponse.success(res, data, 'Report finalized');
    } catch (err) {
      next(err);
    }
  }

  static async exportSection(req, res, next) {
    try {
      const csv = await OperationalReportService.exportSectionCsv(
        req.query.reportDate,
        req.query.cityId,
        req.query.category,
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="operational-${req.query.category || 'section'}.csv"`);
      return res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async template(req, res, next) {
    try {
      const csv = await OperationalReportService.templateCsv(req.query.category);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="operational-template-${req.query.category || 'DEPLOYED'}.csv"`);
      return res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async importSection(req, res, next) {
    try {
      const { reportDate, cityId, category } = req.body;
      const buffer = req.file?.buffer;
      if (!buffer) return ApiResponse.badRequest(res, 'CSV file is required');
      const result = await OperationalReportService.importSectionCsv(
        reportDate,
        cityId,
        category,
        buffer,
        req.user.id,
      );
      return ApiResponse.success(res, result, 'Import completed');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OperationalReportController;
