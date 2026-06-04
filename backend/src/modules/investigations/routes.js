const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { applyUserOwnedListScope, ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');
const InvestigationController = require('./controller');

/**
 * @openapi
 * /investigations:
 *   get:
 *     tags: [Investigations]
 *     summary: List investigations
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...sharedPerm(P.COMPLIANCE_READ), InvestigationController.list);

/**
 * @openapi
 * /investigations/{id}:
 *   get:
 *     tags: [Investigations]
 *     summary: Get investigation with details
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.COMPLIANCE_READ), InvestigationController.getById);

router.get('/:id/attachments/:attachmentId/download', ...sharedPerm(P.COMPLIANCE_READ), async (req, res, next) => {
  try {
    const investigationId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);

    const investigation = await prisma.investigation.findUnique({
      where: { id: investigationId },
      select: { userId: true },
    });
    if (!investigation) throw new NotFoundError('Investigation');

    const attachment = await prisma.investigationAttachment.findFirst({
      where: { id: attachmentId, investigationId },
      select: { fileUrl: true, fileName: true },
    });
    if (!attachment) throw new NotFoundError('Investigation Attachment');

    await assertCanAccessDriverRecord(req, investigation.userId);
    const fallbackName = attachment.fileName || 'investigation-attachment';
    await streamAttachmentDownload(res, attachment.fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /investigations:
 *   post:
 *     tags: [Investigations]
 *     summary: Open investigation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...sharedPerm(P.COMPLIANCE_WRITE), upload.array('attachments', 5), InvestigationController.create);

/**
 * @openapi
 * /investigations/{id}:
 *   patch:
 *     tags: [Investigations]
 *     summary: Update investigation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...sharedPerm(P.COMPLIANCE_WRITE), InvestigationController.update);

/**
 * @openapi
 * /investigations/{id}/respond:
 *   post:
 *     tags: [Investigations]
 *     summary: Subject submits response
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/respond', ...sharedPerm(P.COMPLIANCE_WRITE), upload.array('attachments', 3), InvestigationController.respond);

/**
 * @openapi
 * /investigations/{id}/status:
 *   patch:
 *     tags: [Investigations]
 *     summary: Update investigation status/outcome (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', ...sharedPerm(P.COMPLIANCE_WRITE), InvestigationController.updateStatus);

module.exports = router;
