const ImportService = require('./service');
const ApiResponse = require('../../utils/response');
const { sendExportResponse } = require('../../utils/xlsxWorkbook');
const { normalizeFormat } = require('../../utils/spreadsheetMime');

class ImportController {
  static async template(req, res, next) {
    try {
      const format = normalizeFormat(req.query.format || 'xlsx');
      const result = await ImportService.template(req.params.module, format);
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async meta(req, res, next) {
    try {
      const data = ImportService.meta(req.params.module);
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async importCsv(req, res, next) {
    try {
      const module = req.body.module || req.params.module;
      if (!req.file?.buffer && !req.file?.path) {
        return ApiResponse.error(res, 'Excel or CSV file is required', 400);
      }
      const fs = require('fs');
      const buffer = req.file.buffer || fs.readFileSync(req.file.path);
      const results = await ImportService.importFile(
        module,
        buffer,
        req.user.id,
        req.file.originalname,
      );
      return ApiResponse.success(res, results, 'Import completed');
    } catch (err) {
      next(err);
    }
  }

  static async listModules(req, res, next) {
    try {
      return ApiResponse.success(res, {
        importable: ImportService.supportedModules(),
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ImportController;
