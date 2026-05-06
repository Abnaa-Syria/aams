const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const MaintenanceRequestController = require('./controller');

/**
 * @openapi
 * /maintenance-requests:
 *   get:
 *     tags: [Maintenance Requests]
 *     summary: List maintenance requests
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, MaintenanceRequestController.listRequests);

/**
 * @openapi
 * /maintenance-requests/{id}:
 *   get:
 *     tags: [Maintenance Requests]
 *     summary: Get maintenance request (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, MaintenanceRequestController.getRequest);

/**
 * @openapi
 * /maintenance-requests:
 *   post:
 *     tags: [Maintenance Requests]
 *     summary: Submit maintenance request (multipart attachment)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, upload.single('attachment'), MaintenanceRequestController.createRequest);

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

module.exports = router;
