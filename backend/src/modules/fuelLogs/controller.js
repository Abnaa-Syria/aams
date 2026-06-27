const FuelLogService = require('./service');
const ApiResponse = require('../../utils/response');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

class FuelLogController {
  static async listLogs(req, res, next) {
    try {
      const result = await FuelLogService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getLog(req, res, next) {
    try {
      const log = await FuelLogService.getById(req.params.id);
      await assertCanAccessDriverRecord(req, log.userId);
      return ApiResponse.success(res, log);
    } catch (err) {
      next(err);
    }
  }

  static async createLog(req, res, next) {
    try {
      const log = await FuelLogService.create(req.user, req.body, req.file);
      return ApiResponse.created(res, log, 'Fuel log submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reviewLog(req, res, next) {
    try {
      const existing = await FuelLogService.getById(req.params.id);
      await assertCanAccessDriverRecord(req, existing.userId);
      const log = await FuelLogService.review(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, log, 'Fuel log reviewed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateLog(req, res, next) {
    try {
      const log = await FuelLogService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, log, 'Fuel log updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteLog(req, res, next) {
    try {
      await FuelLogService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Fuel log deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getDailySummary(req, res, next) {
    try {
      const result = await FuelLogService.getDailySummary(req.query, req.user);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getPolicy(req, res, next) {
    try {
      const policy = await FuelLogService.getPolicy();
      return ApiResponse.success(res, policy);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FuelLogController;
