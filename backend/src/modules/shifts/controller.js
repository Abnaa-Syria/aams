const ShiftService = require('./service');
const ApiResponse = require('../../utils/response');

class ShiftController {
  static async list(req, res, next) {
    try {
      const { items, meta } = await ShiftService.list(req.query, req.user);
      return ApiResponse.paginated(res, items, meta);
    } catch (err) { next(err); }
  }
  static async getById(req, res, next) {
    try {
      const item = await ShiftService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) { next(err); }
  }
  static async requestStart(req, res, next) {
    try {
      const shift = await ShiftService.requestStart(req.user.id, req.body);
      return ApiResponse.created(res, shift, 'Shift start requested');
    } catch (err) { next(err); }
  }
  static async approve(req, res, next) {
    try {
      const shift = await ShiftService.approve(req.params.id, req.user);
      return ApiResponse.success(res, shift, 'Shift approved');
    } catch (err) { next(err); }
  }
  static async reject(req, res, next) {
    try {
      const shift = await ShiftService.reject(req.params.id, req.body.reason, req.user);
      return ApiResponse.success(res, shift, 'Shift rejected');
    } catch (err) { next(err); }
  }
  static async startShift(req, res, next) {
    try {
      const shift = await ShiftService.startShift(req.params.id, req.user.id);
      return ApiResponse.success(res, shift, 'Shift started');
    } catch (err) { next(err); }
  }
  static async endShift(req, res, next) {
    try {
      const shift = await ShiftService.endShift(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, shift, 'Shift ended');
    } catch (err) { next(err); }
  }
  static async cancel(req, res, next) {
    try {
      const shift = await ShiftService.cancel(req.params.id, req.body.reason, req.user.id);
      return ApiResponse.success(res, shift, 'Shift cancelled');
    } catch (err) { next(err); }
  }
}

module.exports = ShiftController;
