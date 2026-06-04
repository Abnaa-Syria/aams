const DocumentService = require('./service');
const ApiResponse = require('../../utils/response');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { resolveUserIdFromDriverInput, stripOperationalIdentityFields } = require('../../utils/driverIdentity');

class DocumentController {
  static async list(req, res, next) {
    try {
      const { items, meta } = await DocumentService.list(req.query);
      return ApiResponse.paginated(res, items, meta);
    } catch (err) { next(err); }
  }
  static async getById(req, res, next) {
    try {
      const doc = await DocumentService.getById(req.params.id);
      return ApiResponse.success(res, doc);
    } catch (err) { next(err); }
  }
  static async create(req, res, next) {
    try {
      const data = stripOperationalIdentityFields({ ...req.body });
      if (req.file) { data.fileUrl = normalizeStoredUploadPath(req.file.path); data.fileName = req.file.originalname; }
      
      data.userId = req.user.appRole === 'DRIVER'
        ? req.user.id
        : await resolveUserIdFromDriverInput(req.body, req.user);
      
      delete data.file;
      const doc = await DocumentService.create(data);
      return ApiResponse.created(res, doc, 'Document created');
    } catch (err) { next(err); }
  }
  static async update(req, res, next) {
    try {
      const existing = await DocumentService.getById(req.params.id);
      const data = stripOperationalIdentityFields({ ...req.body });
      if (req.body.appUserId !== undefined) {
        data.userId = await resolveUserIdFromDriverInput(req.body, req.user);
      }
      
      // Prevent transferring to another user for drivers
      if (req.user.appRole === 'DRIVER' && data.userId && parseInt(data.userId, 10) !== existing.userId) {
        throw new AuthorizationError('لا يمكن نقل المستند لمستخدم آخر');
      }
      
      if (req.file) { data.fileUrl = normalizeStoredUploadPath(req.file.path); data.fileName = req.file.originalname; }
      delete data.file;
      const doc = await DocumentService.update(req.params.id, data, req.user);
      return ApiResponse.success(res, doc, 'Document updated');
    } catch (err) { next(err); }
  }
  static async review(req, res, next) {
    try {
      const doc = await DocumentService.review(req.params.id, req.body.status, req.body.reviewNotes, req.user);
      return ApiResponse.success(res, doc, 'Document reviewed');
    } catch (err) { next(err); }
  }
  static async getExpiring(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 30;
      const docs = await DocumentService.getExpiringDocuments(days);
      return ApiResponse.success(res, docs);
    } catch (err) { next(err); }
  }
  static async remove(req, res, next) {
    try {
      await DocumentService.remove(req.params.id, req.user);
      return ApiResponse.success(res, null, 'Document deleted');
    } catch (err) { next(err); }
  }
}

module.exports = DocumentController;
