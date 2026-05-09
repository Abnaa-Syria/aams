const LeaveRequestService = require('./service');
const ApiResponse = require('../../utils/response');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

class LeaveRequestController {
  static async list(req, res, next) {
    try {
      const result = await LeaveRequestService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await LeaveRequestService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async getBalances(req, res, next) {
    try {
      const uid = parseInt(req.params.userId, 10);
      await assertCanAccessDriverRecord(req, uid);
      const balances = await LeaveRequestService.getBalances(uid);
      return ApiResponse.success(res, balances);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
      if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
      const item = await LeaveRequestService.create(uid, req.body, req.file, req.user.id);
      return ApiResponse.created(res, item, 'Leave request submitted');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await LeaveRequestService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Leave request updated');
    } catch (err) {
      next(err);
    }
  }

  static async review(req, res, next) {
    try {
      const item = await LeaveRequestService.review(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Leave request reviewed');
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req, res, next) {
    try {
      const item = await LeaveRequestService.cancel(req.params.id, req.user.id);
      return ApiResponse.success(res, item, 'Leave request cancelled');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LeaveRequestController;
