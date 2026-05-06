const TraineeService = require('./service');
const ApiResponse = require('../../utils/response');

class TraineeController {
  static async list(req, res, next) {
    try {
      const result = await TraineeService.list(req.query);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const trainee = await TraineeService.getById(req.params.id);
      return ApiResponse.success(res, trainee);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const trainee = await TraineeService.create(req.validated.body);
      return ApiResponse.created(res, trainee, 'Trainee created');
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const trainee = await TraineeService.update(req.params.id, req.validated.body);
      return ApiResponse.success(res, trainee, 'Trainee updated');
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      await TraineeService.delete(req.params.id);
      return ApiResponse.success(res, null, 'Trainee deleted');
    } catch (err) { next(err); }
  }
}

module.exports = TraineeController;
