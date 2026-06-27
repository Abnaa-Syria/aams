const ExportService = require('./service');
const ApiResponse = require('../../utils/response');
const { sendExportResponse } = require('../../utils/xlsxWorkbook');
const { normalizeFormat } = require('../../utils/spreadsheetMime');

class ExportController {
  static async listModules(req, res, next) {
    try {
      return ApiResponse.success(res, { exportable: ExportService.supportedModules() });
    } catch (err) {
      next(err);
    }
  }

  static async template(req, res, next) {
    try {
      const format = normalizeFormat(req.query.format || 'xlsx');
      const result = await ExportService.template(req.params.module, format);
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async exportSelected(req, res, next) {
    try {
      const { module, ids = [], format = 'xlsx', filters = {} } = req.body;
      const result = await ExportService.exportSelected(module, ids, format, filters, req);
      if (String(format).toLowerCase() === 'json') {
        return ApiResponse.success(res, result);
      }
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ExportController;
