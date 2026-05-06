const ComplaintService = require('./service');
const ApiResponse = require('../../utils/response');

class ComplaintController {
  static async list(req, res, next) {
    try {
      const result = await ComplaintService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const complaint = await ComplaintService.getById(req.params.id, req.user);
      return ApiResponse.success(res, complaint);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const complaint = await ComplaintService.create(req.user.id, req.validated.body, req.file);
      return ApiResponse.created(res, complaint, 'Complaint submitted successfully');
    } catch (err) { next(err); }
  }

  static async resolve(req, res, next) {
    try {
      const complaint = await ComplaintService.resolve(req.params.id, req.user.id, req.validated.body);
      return ApiResponse.success(res, complaint, 'Complaint status updated');
    } catch (err) { next(err); }
  }
}

module.exports = ComplaintController;
