const ImportService = require('./service');
const ApiResponse = require('../../utils/response');

class ImportController {
  static async template(req, res, next) {
    try {
      const result = ImportService.template(req.params.module);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.csv);
    } catch (err) {
      next(err);
    }
  }

  static async importCsv(req, res, next) {
    try {
      const module = req.body.module || req.params.module;
      if (!req.file?.buffer && !req.file?.path) {
        return ApiResponse.error(res, 'CSV file is required', 400);
      }
      const fs = require('fs');
      const buffer = req.file.buffer || fs.readFileSync(req.file.path);
      const results = await ImportService.importCsv(module, buffer, req.user.id);
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
