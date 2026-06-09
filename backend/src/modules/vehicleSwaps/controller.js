const VehicleSwapService = require('./service');
const ApiResponse = require('../../utils/response');

class VehicleSwapController {
  static async list(req, res, next) {
    try {
      const result = await VehicleSwapService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const swapReq = await VehicleSwapService.create(req.user.id, req.validated.body);
      return ApiResponse.created(res, swapReq, 'Vehicle swap request submitted');
    } catch (err) { next(err); }
  }

  static async review(req, res, next) {
    try {
      const swapReq = await VehicleSwapService.review(req.params.id, req.user.id, req.validated.body, req.user);
      return ApiResponse.success(res, swapReq, 'Vehicle swap request reviewed');
    } catch (err) { next(err); }
  }
}

module.exports = VehicleSwapController;
