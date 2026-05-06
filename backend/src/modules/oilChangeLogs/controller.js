const OilChangeLogService = require('./service');
const ApiResponse = require('../../utils/response');

class OilChangeLogController {
  static async list(req, res, next) {
    try {
      const result = await OilChangeLogService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async report(req, res, next) {
    try {
      const log = await OilChangeLogService.report(req.user.id, req.validated.body, req.file);
      return ApiResponse.created(res, log, 'Oil change logged');
    } catch (err) { next(err); }
  }
}

module.exports = OilChangeLogController;
