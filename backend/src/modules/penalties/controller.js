const PenaltyService = require('./service');
const ApiResponse = require('../../utils/response');

class PenaltyController {
  static async list(req, res, next) {
    try {
      const result = await PenaltyService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getTotals(req, res, next) {
    try {
      const result = await PenaltyService.getTotals();
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await PenaltyService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const item = await PenaltyService.create(req.user.id, req.body);
      return ApiResponse.created(res, item, 'Penalty created');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await PenaltyService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Penalty updated');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const item = await PenaltyService.updateStatus(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Penalty status updated');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      await PenaltyService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Penalty deleted');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PenaltyController;
