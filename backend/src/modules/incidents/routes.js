const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const IncidentController = require('./controller');
const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

/**
 * @openapi
 * /incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List incidents
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, IncidentController.listIncidents);

router.get('/:id/attachments/:attachmentId/download', authenticate, async (req, res, next) => {
  try {
    const incidentId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const att = await prisma.incidentAttachment.findFirst({
      where: { id: attachmentId, incidentId },
      include: { incident: { select: { userId: true } } },
    });
    if (!att) throw new NotFoundError('Attachment');
    await assertCanAccessDriverRecord(req, att.incident.userId);
    const fallbackName = att.fileName || (att.fileUrl && String(att.fileUrl).split('/').pop()) || 'attachment';
    await streamAttachmentDownload(res, att.fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident by ID (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, IncidentController.getIncident);

/**
 * @openapi
 * /incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Report incident (multipart attachments, max 5)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, upload.array('attachments', 5), IncidentController.createIncident);

/**
 * @openapi
 * /incidents/{id}/status:
 *   patch:
 *     tags: [Incidents]
 *     summary: Update incident status (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), IncidentController.updateStatus);

/**
 * @openapi
 * /incidents/{id}/convert-maintenance:
 *   post:
 *     tags: [Incidents]
 *     summary: Convert incident to maintenance request (admin)
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/convert-maintenance', ...adminPerm(P.FLEET_WRITE), IncidentController.convertToMaintenance);

/**
 * @openapi
 * /incidents/{id}:
 *   delete:
 *     tags: [Incidents]
 *     summary: Delete incident (admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminPerm(P.COMPLIANCE_WRITE), IncidentController.deleteIncident);

module.exports = router;
