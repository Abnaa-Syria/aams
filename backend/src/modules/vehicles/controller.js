const VehicleService = require('./service');
const ApiResponse = require('../../utils/response');

class VehicleController {
  static async list(req, res, next) {
    try {
      const { vehicles, meta } = await VehicleService.list(req.query);
      return ApiResponse.paginated(res, vehicles, meta);
    } catch (err) { next(err); }
  }
  static async getById(req, res, next) {
    try {
      const vehicle = await VehicleService.getById(req.params.id);
      return ApiResponse.success(res, vehicle);
    } catch (err) { next(err); }
  }
  static async create(req, res, next) {
    try {
      const vehicle = await VehicleService.create(req.body);
      return ApiResponse.created(res, vehicle, 'Vehicle created');
    } catch (err) { next(err); }
  }
  static async update(req, res, next) {
    try {
      const vehicle = await VehicleService.update(req.params.id, req.body, req.user);
      return ApiResponse.success(res, vehicle, 'Vehicle updated');
    } catch (err) { next(err); }
  }
  static async assignDriver(req, res, next) {
    try {
      const result = await VehicleService.assignDriver(req.params.id, req.body.userId, req.body.notes, req.user);
      return ApiResponse.success(res, result, 'Driver assigned to vehicle');
    } catch (err) { next(err); }
  }
  static async releaseDriver(req, res, next) {
    try {
      await VehicleService.releaseDriver(req.params.id, req.user);
      return ApiResponse.success(res, null, 'Driver released from vehicle');
    } catch (err) { next(err); }
  }
  static async remove(req, res, next) {
    try {
      await VehicleService.softDelete(req.params.id, req.user);
      return ApiResponse.success(res, null, 'Vehicle deleted');
    } catch (err) { next(err); }
  }
}

module.exports = VehicleController;
