const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const IncidentController = require('./controller');

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

module.exports = router;
