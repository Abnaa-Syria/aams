const SubstituteVehicleService = require('./service');
const ApiResponse = require('../../utils/response');

class SubstituteVehicleController {
  static async list(req, res, next) {
    try {
      const result = await SubstituteVehicleService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async assign(req, res, next) {
    try {
      const assign = await SubstituteVehicleService.assign(req.validated.body, req.user.id);
      return ApiResponse.created(res, assign, 'Substitute vehicle assigned');
    } catch (err) { next(err); }
  }

  static async returnVehicle(req, res, next) {
    try {
      const assign = await SubstituteVehicleService.returnVehicle(req.params.id, req.user.id, req.validated.body);
      return ApiResponse.success(res, assign, 'Substitute vehicle returned');
    } catch (err) { next(err); }
  }
}

module.exports = SubstituteVehicleController;
