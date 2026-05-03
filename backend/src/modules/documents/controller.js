const DocumentService = require('./service');
const ApiResponse = require('../../utils/response');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

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
      const data = { ...req.body };
      if (req.file) { data.fileUrl = normalizeStoredUploadPath(req.file.path); data.fileName = req.file.originalname; }
      let userId = parseInt(data.userId, 10);
      if (!ADMIN_ROLES.has(req.user.role)) {
        if (req.user.role === 'DRIVER') userId = req.user.id;
        else await assertCanAccessDriverRecord(req, userId);
      }
      data.userId = userId;
      const doc = await DocumentService.create(data);
      return ApiResponse.created(res, doc, 'Document created');
    } catch (err) { next(err); }
  }
  static async update(req, res, next) {
    try {
      const existing = await DocumentService.getById(req.params.id);
      await assertCanAccessDriverRecord(req, existing.userId);
      const data = { ...req.body };
      if (data.userId !== undefined) {
        const newUid = parseInt(data.userId, 10);
        if (!ADMIN_ROLES.has(req.user.role) && newUid !== existing.userId) {
          throw new AuthorizationError('لا يمكن نقل المستند لمستخدم آخر');
        }
        await assertCanAccessDriverRecord(req, newUid);
      }
      if (req.file) { data.fileUrl = normalizeStoredUploadPath(req.file.path); data.fileName = req.file.originalname; }
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
