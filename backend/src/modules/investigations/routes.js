const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
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
router.get('/', authenticate, InvestigationController.list);

/**
 * @openapi
 * /investigations/{id}:
 *   get:
 *     tags: [Investigations]
 *     summary: Get investigation with details
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, InvestigationController.getById);

/**
 * @openapi
 * /investigations:
 *   post:
 *     tags: [Investigations]
 *     summary: Open investigation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...adminPerm(P.COMPLIANCE_WRITE), upload.array('attachments', 5), InvestigationController.create);

/**
 * @openapi
 * /investigations/{id}:
 *   patch:
 *     tags: [Investigations]
 *     summary: Update investigation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...adminPerm(P.COMPLIANCE_WRITE), InvestigationController.update);

/**
 * @openapi
 * /investigations/{id}/respond:
 *   post:
 *     tags: [Investigations]
 *     summary: Subject submits response
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/respond', authenticate, upload.array('attachments', 3), InvestigationController.respond);

/**
 * @openapi
 * /investigations/{id}/status:
 *   patch:
 *     tags: [Investigations]
 *     summary: Update investigation status/outcome (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), InvestigationController.updateStatus);

module.exports = router;
