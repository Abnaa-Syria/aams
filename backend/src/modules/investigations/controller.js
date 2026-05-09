const InvestigationService = require('./service');
const ApiResponse = require('../../utils/response');

class InvestigationController {
  static async list(req, res, next) {
    try {
      const result = await InvestigationService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await InvestigationService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const item = await InvestigationService.create(req.user.id, req.body, req.files);
      return ApiResponse.created(res, item, 'Investigation created');
    } catch (err) {
      next(err);
    }
  }

  static async respond(req, res, next) {
    try {
      const item = await InvestigationService.respond(req.params.id, req.user.id, req.body.response, req.files);
      return ApiResponse.success(res, item, 'Response submitted');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await InvestigationService.update(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Investigation updated');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const item = await InvestigationService.updateStatus(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Investigation status updated');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InvestigationController;
