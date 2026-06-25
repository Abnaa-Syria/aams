const FinancialLedgerService = require('./service');
const ApiResponse = require('../../utils/response');

class FinancialLedgerController {
  static async getBundle(req, res, next) {
    try {
      const data = await FinancialLedgerService.getBundle(req.query);
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async generate(req, res, next) {
    try {
      const data = await FinancialLedgerService.generateSnapshot(req.body.reportDate, req.user.id);
      return ApiResponse.success(res, data, 'Financial ledger generated');
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req, res, next) {
    try {
      const bundle = await FinancialLedgerService.getBundle(req.query);
      const csv = FinancialLedgerService.exportCsv(bundle);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="financial-ledger.csv"');
      return res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async template(req, res, next) {
    try {
      const csv = FinancialLedgerService.templateCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="financial-ledger-template.csv"');
      return res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async importCsv(req, res, next) {
    try {
      if (!req.file?.buffer) return ApiResponse.badRequest(res, 'CSV file required');
      const result = await FinancialLedgerService.importCsv(req.body.reportDate, req.file.buffer);
      return ApiResponse.success(res, result, 'Import completed');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FinancialLedgerController;
