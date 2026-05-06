const GeofencingService = require('./service');
const ApiResponse = require('../../utils/response');

class GeofencingController {
  // --- LOCATIONS ---

  static async logLocation(req, res, next) {
    try {
      await GeofencingService.logLocation(req.user.id, req.validated.body);
      return ApiResponse.created(res, null, 'Location logged');
    } catch (err) { next(err); }
  }

  static async bulkLogLocations(req, res, next) {
    try {
      await GeofencingService.bulkLogLocations(req.user.id, req.validated.body.locations);
      return ApiResponse.created(res, null, 'Locations logged');
    } catch (err) { next(err); }
  }

  static async getLocationHistory(req, res, next) {
    try {
      const result = await GeofencingService.getLocationHistory(req.query);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getLatestLocations(req, res, next) {
    try {
      const result = await GeofencingService.getLatestLocations(req.query);
      return ApiResponse.success(res, result);
    } catch (err) { next(err); }
  }

  // --- ZONES ---

  static async listZones(req, res, next) {
    try {
      const result = await GeofencingService.listZones(req.query);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) { next(err); }
  }

  static async getZone(req, res, next) {
    try {
      const zone = await GeofencingService.getZone(req.params.id);
      return ApiResponse.success(res, zone);
    } catch (err) { next(err); }
  }

  static async createZone(req, res, next) {
    try {
      const zone = await GeofencingService.createZone(req.validated.body, req.user.id);
      return ApiResponse.created(res, zone, 'Zone created');
    } catch (err) { next(err); }
  }

  static async updateZone(req, res, next) {
    try {
      const zone = await GeofencingService.updateZone(req.params.id, req.validated.body, req.user.id);
      return ApiResponse.success(res, zone, 'Zone updated');
    } catch (err) { next(err); }
  }
}

module.exports = GeofencingController;
