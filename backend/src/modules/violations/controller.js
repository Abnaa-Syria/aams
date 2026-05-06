const ViolationService = require('./service');
const ApiResponse = require('../../utils/response');

class ViolationController {
  static async listViolations(req, res, next) {
    try {
      const result = await ViolationService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getViolation(req, res, next) {
    try {
      const violation = await ViolationService.getById(req.params.id, req.user);
      return ApiResponse.success(res, violation);
    } catch (err) {
      next(err);
    }
  }

  static async createViolation(req, res, next) {
    try {
      const violation = await ViolationService.create(req.user.id, req.body, req.files);
      return ApiResponse.created(res, violation, 'Violation reported successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateViolation(req, res, next) {
    try {
      const violation = await ViolationService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, violation, 'Violation updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reviewViolation(req, res, next) {
    try {
      const violation = await ViolationService.review(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, violation, 'Violation reviewed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteViolation(req, res, next) {
    try {
      await ViolationService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Violation deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ViolationController;
