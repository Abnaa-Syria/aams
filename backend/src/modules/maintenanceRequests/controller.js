const MaintenanceRequestService = require('./service');
const ApiResponse = require('../../utils/response');

class MaintenanceRequestController {
  static async listRequests(req, res, next) {
    try {
      const result = await MaintenanceRequestService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getRequest(req, res, next) {
    try {
      const request = await MaintenanceRequestService.getById(req.params.id, req.user);
      return ApiResponse.success(res, request);
    } catch (err) {
      next(err);
    }
  }

  static async createRequest(req, res, next) {
    try {
      const request = await MaintenanceRequestService.create(req.user.id, req.body, req.file);
      return ApiResponse.created(res, request, 'Maintenance request submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const request = await MaintenanceRequestService.updateStatus(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, request, 'Maintenance request status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteRequest(req, res, next) {
    try {
      await MaintenanceRequestService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Maintenance request deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MaintenanceRequestController;
