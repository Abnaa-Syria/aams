const LicenseTestService = require('./service');
const ApiResponse = require('../../utils/response');

class LicenseTestController {
  static async list(req, res, next) {
    try {
      const result = await LicenseTestService.list(req.query);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const licenseTest = await LicenseTestService.getById(req.params.id);
      return ApiResponse.success(res, licenseTest);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const licenseTest = await LicenseTestService.create(req.validated.body);
      return ApiResponse.created(res, licenseTest, 'License test record created');
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const licenseTest = await LicenseTestService.update(req.params.id, req.validated.body);
      return ApiResponse.success(res, licenseTest, 'License test record updated');
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      await LicenseTestService.delete(req.params.id);
      return ApiResponse.success(res, null, 'License test record deleted');
    } catch (err) { next(err); }
  }
}

module.exports = LicenseTestController;
