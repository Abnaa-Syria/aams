const CanceledOrderService = require('./service');
const ApiResponse = require('../../utils/response');

class CanceledOrderController {
  static async list(req, res, next) {
    try {
      const result = await CanceledOrderService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async report(req, res, next) {
    try {
      const log = await CanceledOrderService.report(req.user.id, req.validated.body, req.file);
      return ApiResponse.created(res, log, 'Canceled order reported');
    } catch (err) { next(err); }
  }
}

module.exports = CanceledOrderController;
