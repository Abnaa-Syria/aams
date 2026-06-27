const FinancialLedgerService = require('./service');
const ApiResponse = require('../../utils/response');
const { sendExportResponse } = require('../../utils/xlsxWorkbook');
const { normalizeFormat } = require('../../utils/spreadsheetMime');

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
      const format = normalizeFormat(req.query.format || 'xlsx');
      const bundle = await FinancialLedgerService.getBundle(req.query);
      const result = await FinancialLedgerService.exportLedger(bundle, format);
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async template(req, res, next) {
    try {
      const format = normalizeFormat(req.query.format || 'xlsx');
      const result = await FinancialLedgerService.exportTemplate(format);
      return sendExportResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static importMeta(req, res, next) {
    try {
      const data = FinancialLedgerService.importMeta();
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async importCsv(req, res, next) {
    try {
      if (!req.file?.buffer) return ApiResponse.badRequest(res, 'Excel or CSV file required');
      const result = await FinancialLedgerService.importFile(
        req.body.reportDate,
        req.file.buffer,
        req.file.originalname,
      );
      return ApiResponse.success(res, result, 'Import completed');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FinancialLedgerController;
