const SalaryAdvanceService = require('./service');
const ApiResponse = require('../../utils/response');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { resolveUserIdFromDriverInput } = require('../../utils/driverIdentity');

class SalaryAdvanceController {
  static async list(req, res, next) {
    try {
      const result = await SalaryAdvanceService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await SalaryAdvanceService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      let uid = ADMIN_ROLES.has(req.user.role)
        ? await resolveUserIdFromDriverInput(req.body, req.user)
        : req.user.id;
      const item = await SalaryAdvanceService.create(uid, req.body, req.user.id);
      return ApiResponse.created(res, item, 'Salary advance requested');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await SalaryAdvanceService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Salary advance updated');
    } catch (err) {
      next(err);
    }
  }

  static async review(req, res, next) {
    try {
      const item = await SalaryAdvanceService.review(req.params.id, req.user.id, req.body, req.user);
      return ApiResponse.success(res, item, 'Salary advance reviewed');
    } catch (err) {
      next(err);
    }
  }

  static async supervisorReview(req, res, next) {
    try {
      const item = await SalaryAdvanceService.supervisorReview(req.params.id, req.user, req.body);
      return ApiResponse.success(res, item, 'Supervisor review recorded');
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req, res, next) {
    try {
      const item = await SalaryAdvanceService.cancel(req.params.id, req.user.id);
      return ApiResponse.success(res, item, 'Salary advance cancelled');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SalaryAdvanceController;
