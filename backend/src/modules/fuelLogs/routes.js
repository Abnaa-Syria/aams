const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const FuelLogController = require('./controller');

/**
 * @openapi
 * /fuel-logs:
 *   get:
 *     tags: [Fuel Logs]
 *     summary: List fuel logs
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, FuelLogController.listLogs);

/**
 * @openapi
 * /fuel-logs/{id}:
 *   get:
 *     tags: [Fuel Logs]
 *     summary: Get fuel log by ID (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, FuelLogController.getLog);

/**
 * @openapi
 * /fuel-logs:
 *   post:
 *     tags: [Fuel Logs]
 *     summary: Submit fuel log (multipart receipt)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, upload.single('receipt'), FuelLogController.createLog);

/**
 * @openapi
 * /fuel-logs/{id}/review:
 *   patch:
 *     tags: [Fuel Logs]
 *     summary: Review fuel log (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/review', ...adminPerm(P.COMPLIANCE_WRITE), FuelLogController.reviewLog);

/**
 * @openapi
 * /fuel-logs/{id}:
 *   delete:
 *     tags: [Fuel Logs]
 *     summary: Delete fuel log (admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminPerm(P.COMPLIANCE_WRITE), FuelLogController.deleteLog);

module.exports = router;

module.exports = router;
