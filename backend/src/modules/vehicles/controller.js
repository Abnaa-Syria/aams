const VehicleService = require('./service');
const ApiResponse = require('../../utils/response');
const { resolveUserIdFromDriverInput } = require('../../utils/driverIdentity');

class VehicleController {
  static async list(req, res, next) {
    try {
      const { vehicles, meta } = await VehicleService.list(req.query, req.user);
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
  static async createForDriver(req, res, next) {
    try {
      const result = await VehicleService.createForDriver(req.user, req.body);
      const message = result.submissionType === 'PENDING_REPLACEMENT'
        ? 'تم إرسال طلب استبدال المركبة للمراجعة'
        : 'تم إرسال طلب المركبة للمراجعة';
      return ApiResponse.created(res, result, message);
    } catch (err) { next(err); }
  }
  static async approveDriverSubmission(req, res, next) {
    try {
      const vehicle = await VehicleService.approveDriverSubmission(req.params.id, req.user, req.body);
      return ApiResponse.success(res, vehicle, 'تمت الموافقة على مركبة السائق');
    } catch (err) { next(err); }
  }
  static async rejectDriverSubmission(req, res, next) {
    try {
      const vehicle = await VehicleService.rejectDriverSubmission(req.params.id, req.user, req.body);
      return ApiResponse.success(res, vehicle, 'تم رفض طلب مركبة السائق');
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
      const userId = await resolveUserIdFromDriverInput(req.body, req.user);
      const result = await VehicleService.assignDriver(req.params.id, userId, req.body.notes, req.user);
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
  static async getSummary(req, res, next) {
    try {
      const summary = await VehicleService.getVehicleProfileSummary(req.params.id, req.user);
      return ApiResponse.success(res, summary);
    } catch (err) { next(err); }
  }
  static async listAssignments(req, res, next) {
    try {
      const { items, meta } = await VehicleService.listAssignments(req.query);
      return ApiResponse.paginated(res, items, meta);
    } catch (err) { next(err); }
  }
}

module.exports = VehicleController;
