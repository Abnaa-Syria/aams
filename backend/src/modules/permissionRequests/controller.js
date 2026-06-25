const PermissionRequestService = require('./service');
const ApiResponse = require('../../utils/response');

class PermissionRequestController {
  static async list(req, res, next) {
    try {
      const result = await PermissionRequestService.list(req.query, req.user, req);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await PermissionRequestService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const userId = req.user.appRole === 'DRIVER' ? req.user.id : parseInt(req.body.userId, 10) || req.user.id;
      const appUserId = req.user.appUserId || null;
      const item = await PermissionRequestService.create(userId, req.body, appUserId);
      return ApiResponse.created(res, item, 'Permission request created');
    } catch (err) {
      next(err);
    }
  }

  static async review(req, res, next) {
    try {
      const item = await PermissionRequestService.review(req.params.id, req.user, req.body);
      return ApiResponse.success(res, item, 'Permission request reviewed');
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req, res, next) {
    try {
      const item = await PermissionRequestService.cancel(req.params.id, req.user.id);
      return ApiResponse.success(res, item, 'Permission request cancelled');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PermissionRequestController;
