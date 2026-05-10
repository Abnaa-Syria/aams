const PlatformAccountService = require('./service');
const ApiResponse = require('../../utils/response');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const prisma = require('../../config/database');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');

class PlatformAccountController {
  static async list(req, res, next) {
    try {
      const result = await PlatformAccountService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const item = await PlatformAccountService.getById(req.params.id, req.user);
      return ApiResponse.success(res, item);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      // Resolve userId based on appRole
      // DRIVER: use own appUserId from token
      // SUPERVISOR/ADMIN: use body.userId if provided
      let userId;
      if (req.user.appRole === 'DRIVER') {
        userId = req.user.appUserId;
      } else {
        userId = req.body.userId ? parseInt(req.body.userId, 10) : req.user.appUserId;
      }
      const item = await PlatformAccountService.create(userId, req.body, req.file, req.user.id);
      return ApiResponse.created(res, item, 'Platform account created');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await PlatformAccountService.update(req.params.id, req.user.id, req.body, req.file, req.user);
      return ApiResponse.success(res, item, 'Platform account updated');
    } catch (err) {
      next(err);
    }
  }

  static async verify(req, res, next) {
    try {
      const item = await PlatformAccountService.verify(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, item, 'Platform account verified');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const account = await prisma.platformAccount.findUnique({ where: { id: parseInt(req.params.id) } });
      if (!account) throw new NotFoundError('Platform Account');
      if (!ADMIN_ROLES.has(req.user.role) && account.userId !== req.user.id) {
         throw new AuthorizationError('Unauthorized to delete this account');
      }
      await PlatformAccountService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Platform account deleted');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PlatformAccountController;
