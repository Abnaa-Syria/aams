const SupervisorService = require('./service');
const ApiResponse = require('../../utils/response');

class SupervisorController {
  static async list(req, res, next) {
    try {
      const { supervisors, meta } = await SupervisorService.list(req.query);
      return ApiResponse.paginated(res, supervisors, meta);
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const supervisor = await SupervisorService.getById(req.params.id);
      return ApiResponse.success(res, supervisor);
    } catch (err) { next(err); }
  }

  static async getDrivers(req, res, next) {
    try {
      const { drivers, meta } = await SupervisorService.getDrivers(req.params.id, req.query);
      return ApiResponse.paginated(res, drivers, meta);
    } catch (err) { next(err); }
  }

  static async assignDrivers(req, res, next) {
    try {
      const result = await SupervisorService.assignDrivers(req.params.id, req.body.driverIds);
      return ApiResponse.success(res, result, 'Drivers assigned successfully');
    } catch (err) { next(err); }
  }

  static async getMyDashboard(req, res, next) {
    try {
      const dashboard = await SupervisorService.getMyDashboard(req.user);
      return ApiResponse.success(res, dashboard);
    } catch (err) { next(err); }
  }

  static async getMyDrivers(req, res, next) {
    try {
      const { drivers, meta } = await SupervisorService.getMyDrivers(req.user, req.query);
      return ApiResponse.paginated(res, drivers, meta);
    } catch (err) { next(err); }
  }
}

module.exports = SupervisorController;
