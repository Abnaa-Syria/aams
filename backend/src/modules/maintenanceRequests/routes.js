const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const MaintenanceRequestController = require('./controller');
const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

/**
 * @openapi
 * /maintenance-requests:
 *   get:
 *     tags: [Maintenance Requests]
 *     summary: List maintenance requests
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...sharedPerm(P.INVENTORY_READ), MaintenanceRequestController.listRequests);

router.get('/:id/attachment/download', ...sharedPerm(P.INVENTORY_READ), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await prisma.maintenanceRequest.findUnique({
      where: { id },
      select: { userId: true, attachmentUrl: true },
    });
    if (!row) throw new NotFoundError('Maintenance Request');
    await assertCanAccessDriverRecord(req, row.userId);
    const fallbackName =
      (row.attachmentUrl && String(row.attachmentUrl).split('/').pop()) || 'attachment';
    await streamAttachmentDownload(res, row.attachmentUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attachments/:attachmentId/download', ...sharedPerm(P.INVENTORY_READ), async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const att = await prisma.maintenanceRequestAttachment.findFirst({
      where: { id: attachmentId, maintenanceRequestId: requestId },
      include: { maintenanceRequest: { select: { userId: true } } },
    });
    if (!att) throw new NotFoundError('Attachment');
    await assertCanAccessDriverRecord(req, att.maintenanceRequest.userId);
    const fallbackName =
      att.fileName || (att.fileUrl && String(att.fileUrl).split('/').pop()) || 'attachment';
    await streamAttachmentDownload(res, att.fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /maintenance-requests/{id}:
 *   get:
 *     tags: [Maintenance Requests]
 *     summary: Get maintenance request (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.INVENTORY_READ), MaintenanceRequestController.getRequest);

/**
 * @openapi
 * /maintenance-requests:
 *   post:
 *     tags: [Maintenance Requests]
 *     summary: Submit maintenance request (multipart attachments)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  ...sharedPerm(P.INVENTORY_WRITE),
  upload.fields([
    { name: 'attachments', maxCount: 10 },
    { name: 'attachment', maxCount: 1 },
  ]),
  MaintenanceRequestController.createRequest,
);

/**
 * @openapi
 * /maintenance-requests/{id}:
 *   patch:
 *     tags: [Maintenance Requests]
 *     summary: Update maintenance request (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...adminPerm(P.FLEET_WRITE), MaintenanceRequestController.updateRequest);

/**
 * @openapi
 * /maintenance-requests/{id}/status:
 *   patch:
 *     tags: [Maintenance Requests]
 *     summary: Update workflow status (admin fleet)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', ...adminPerm(P.FLEET_WRITE), MaintenanceRequestController.updateStatus);

/**
 * @openapi
 * /maintenance-requests/{id}:
 *   delete:
 *     tags: [Maintenance Requests]
 *     summary: Delete maintenance request (admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminPerm(P.FLEET_WRITE), MaintenanceRequestController.deleteRequest);

module.exports = router;
