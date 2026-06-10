const UserService = require('./service');
const ApiResponse = require('../../utils/response');

class UserController {
  static async list(req, res, next) {
    try {
      const { users, meta } = await UserService.list(req.query, req.user);
      return ApiResponse.paginated(res, users, meta, 'Users retrieved');
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const user = await UserService.getById(req.params.id, req.user);
      return ApiResponse.success(res, user, 'User retrieved');
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const user = await UserService.create(req.body);
      return ApiResponse.created(res, user, 'User created successfully');
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const user = await UserService.update(req.params.id, req.body, req.user);
      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (err) { next(err); }
  }

  static async changeStatus(req, res, next) {
    try {
      const { accountStatus, reason } = req.body;
      const user = await UserService.changeStatus(req.params.id, accountStatus, reason, req.user);
      return ApiResponse.success(res, user, 'Status updated successfully');
    } catch (err) { next(err); }
  }

  static async assignSupervisor(req, res, next) {
    try {
      const user = await UserService.assignSupervisor(req.params.id, req.body.supervisorId, req.user);
      return ApiResponse.success(res, user, 'Supervisor assigned');
    } catch (err) { next(err); }
  }

  static async remove(req, res, next) {
    try {
      await UserService.softDelete(req.params.id, req.user);
      return ApiResponse.success(res, null, 'User deleted successfully');
    } catch (err) { next(err); }
  }

  static async restore(req, res, next) {
    try {
      const user = await UserService.restore(req.params.id, req.user);
      return ApiResponse.success(res, user, 'User restored successfully');
    } catch (err) { next(err); }
  }
}

module.exports = UserController;
