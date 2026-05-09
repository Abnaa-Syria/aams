const RewardService = require('./service');
const ApiResponse = require('../../utils/response');

class RewardController {
  static async list(req, res, next) {
    try {
      const result = await RewardService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req, res, next) {
    try {
      const result = await RewardService.getSummary();
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await RewardService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const item = await RewardService.create(req.user.id, req.body);
      return ApiResponse.created(res, item, 'Reward created');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await RewardService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Reward updated');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const item = await RewardService.updateStatus(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Reward status updated');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      await RewardService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Reward deleted');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RewardController;
