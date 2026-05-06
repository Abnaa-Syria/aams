const BreakRequestService = require('./service');
const ApiResponse = require('../../utils/response');

class BreakRequestController {
  static async list(req, res, next) {
    try {
      const result = await BreakRequestService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const breakReq = await BreakRequestService.create(req.user.id, req.validated.body);
      return ApiResponse.created(res, breakReq, 'Break request submitted');
    } catch (err) { next(err); }
  }

  static async review(req, res, next) {
    try {
      const breakReq = await BreakRequestService.review(req.params.id, req.user.id, req.validated.body);
      return ApiResponse.success(res, breakReq, 'Break request reviewed');
    } catch (err) { next(err); }
  }

  static async startBreak(req, res, next) {
    try {
      const breakReq = await BreakRequestService.startBreak(req.params.id, req.user.id);
      return ApiResponse.success(res, breakReq, 'Break started');
    } catch (err) { next(err); }
  }

  static async endBreak(req, res, next) {
    try {
      const breakReq = await BreakRequestService.endBreak(req.params.id, req.user.id);
      return ApiResponse.success(res, breakReq, 'Break ended');
    } catch (err) { next(err); }
  }
}

module.exports = BreakRequestController;
