const AssetService = require('./service');
const ApiResponse = require('../../utils/response');

class AssetController {
  static async listAssets(req, res, next) {
    try {
      const result = await AssetService.listAssets(req.query);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getAsset(req, res, next) {
    try {
      const asset = await AssetService.getAsset(req.params.id);
      return ApiResponse.success(res, asset);
    } catch (err) { next(err); }
  }

  static async createAsset(req, res, next) {
    try {
      const asset = await AssetService.createAsset(req.validated.body, req.user.id);
      return ApiResponse.created(res, asset, 'Asset created');
    } catch (err) { next(err); }
  }

  static async updateAsset(req, res, next) {
    try {
      const asset = await AssetService.updateAsset(req.params.id, req.validated.body, req.user.id);
      return ApiResponse.success(res, asset, 'Asset updated');
    } catch (err) { next(err); }
  }

  static async listAssignments(req, res, next) {
    try {
      const result = await AssetService.listAssignments(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async assignAsset(req, res, next) {
    try {
      const assignment = await AssetService.assignAsset(req.validated.body, req.file, req.user.id);
      return ApiResponse.created(res, assignment, 'Asset assigned successfully');
    } catch (err) { next(err); }
  }

  static async returnAsset(req, res, next) {
    try {
      const assignment = await AssetService.returnAsset(req.params.id, req.validated.body, req.file, req.user.id);
      return ApiResponse.success(res, assignment, 'Asset returned successfully');
    } catch (err) { next(err); }
  }
}

module.exports = AssetController;
