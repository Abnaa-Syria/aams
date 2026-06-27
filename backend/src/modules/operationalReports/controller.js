const OperationalReportService = require('./service');
const ApiResponse = require('../../utils/response');
const { sendExportResponse } = require('../../utils/xlsxWorkbook');
const { normalizeFormat } = require('../../utils/spreadsheetMime');

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
      const format = normalizeFormat(req.query.format || 'xlsx');
      const result = await OperationalReportService.exportSection(
        req.query.reportDate,
        req.query.cityId,
        req.query.category,
        format,
      );
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async exportAll(req, res, next) {
    try {
      const format = normalizeFormat(req.query.format || 'xlsx');
      const result = await OperationalReportService.exportAllSections(
        req.query.reportDate,
        req.query.cityId,
        format,
      );
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async template(req, res, next) {
    try {
      const format = normalizeFormat(req.query.format || 'xlsx');
      const result = await OperationalReportService.exportSectionTemplate(req.query.category, format);
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async importMeta(req, res, next) {
    try {
      const data = await OperationalReportService.importMeta(req.query.category);
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async importSection(req, res, next) {
    try {
      const { reportDate, cityId, category } = req.body;
      const buffer = req.file?.buffer;
      if (!buffer) return ApiResponse.badRequest(res, 'Excel or CSV file is required');
      const result = await OperationalReportService.importSectionCsv(
        reportDate,
        cityId,
        category,
        buffer,
        req.user.id,
        req.file.originalname,
      );
      return ApiResponse.success(res, result, 'Import completed');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OperationalReportController;
