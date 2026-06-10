const IncidentService = require('./service');
const ApiResponse = require('../../utils/response');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

function collectUploadedFiles(req) {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;
  const attachments = req.files.attachments || [];
  const attachment = req.files.attachment || [];
  return [...attachments, ...attachment];
}

class IncidentController {
  static async listIncidents(req, res, next) {
    try {
      const result = await IncidentService.list(req.query, req.user);
      return ApiResponse.paginated(res, result.items, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getIncident(req, res, next) {
    try {
      const incident = await IncidentService.getById(req.params.id);
      await assertCanAccessDriverRecord(req, incident.userId);
      return ApiResponse.success(res, incident);
    } catch (err) {
      next(err);
    }
  }

  static async createIncident(req, res, next) {
    try {
      const incident = await IncidentService.create(req.user.id, req.body, collectUploadedFiles(req));
      return ApiResponse.created(res, incident, 'Incident reported successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const existing = await IncidentService.getById(req.params.id);
      await assertCanAccessDriverRecord(req, existing.userId);
      const incident = await IncidentService.updateStatus(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, incident, 'Incident status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async convertToMaintenance(req, res, next) {
    try {
      const maintenance = await IncidentService.convertToMaintenance(req.params.id, req.user.id, req.body);
      return ApiResponse.created(res, maintenance, 'Incident converted to maintenance request');
    } catch (err) {
      next(err);
    }
  }

  static async deleteIncident(req, res, next) {
    try {
      await IncidentService.delete(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Incident deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = IncidentController;
