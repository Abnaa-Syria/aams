const PlatformAccountService = require('./service');
const ApiResponse = require('../../utils/response');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const prisma = require('../../config/database');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { resolveUserIdFromDriverInput } = require('../../utils/driverIdentity');
const { pickPlatformAccountUploadFile } = require('../../utils/platformAccountUpload');

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
      const userId = req.user.appRole === 'DRIVER'
        ? req.user.id
        : await resolveUserIdFromDriverInput(req.body, req.user);
      const item = await PlatformAccountService.create(userId, req.body, pickPlatformAccountUploadFile(req), req.user.id);
      return ApiResponse.created(res, item, 'Platform account created');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const item = await PlatformAccountService.update(req.params.id, req.user.id, req.body, pickPlatformAccountUploadFile(req), req.user);
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
