const ExportService = require('./service');
const ApiResponse = require('../../utils/response');

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
      const result = ExportService.templateCsv(req.params.module);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportSelected(req, res, next) {
    try {
      const { module, ids = [], format = 'csv', filters = {} } = req.body;
      const result = await ExportService.exportSelected(module, ids, format, filters, req);
      if (format === 'json') {
        return ApiResponse.success(res, result);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.csv);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ExportController;
