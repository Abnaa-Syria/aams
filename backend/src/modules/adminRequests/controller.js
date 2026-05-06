const AdminRequestService = require('./service');
const ApiResponse = require('../../utils/response');

class AdminRequestController {
  static async list(req, res, next) {
    try {
      const result = await AdminRequestService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const adminReq = await AdminRequestService.getById(req.params.id, req.user);
      return ApiResponse.success(res, adminReq);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const adminReq = await AdminRequestService.create(req.user.id, req.validated.body);
      return ApiResponse.created(res, adminReq, 'Request submitted successfully');
    } catch (err) { next(err); }
  }

  static async review(req, res, next) {
    try {
      const adminReq = await AdminRequestService.review(req.params.id, req.user.id, req.validated.body);
      return ApiResponse.success(res, adminReq, 'Request reviewed successfully');
    } catch (err) { next(err); }
  }

  static async cancel(req, res, next) {
    try {
      const adminReq = await AdminRequestService.cancel(req.params.id, req.user.id);
      return ApiResponse.success(res, adminReq, 'Request cancelled');
    } catch (err) { next(err); }
  }
}

module.exports = AdminRequestController;
