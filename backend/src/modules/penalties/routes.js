const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const PenaltyController = require('./controller');

/**
 * @openapi
 * /penalties:
 *   get:
 *     tags: [Penalties]
 *     summary: List penalties
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...sharedPerm(P.COMPLIANCE_READ), PenaltyController.list);

/**
 * @openapi
 * /penalties/totals:
 *   get:
 *     tags: [Penalties]
 *     summary: Sum/count of APPLIED penalties
 *     security:
 *       - bearerAuth: []
 */
router.get('/totals', ...sharedPerm(P.COMPLIANCE_READ), PenaltyController.getTotals);

/**
 * @openapi
 * /penalties/{id}:
 *   get:
 *     tags: [Penalties]
 *     summary: Get penalty by ID
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.COMPLIANCE_READ), PenaltyController.getById);

/**
 * @openapi
 * /penalties:
 *   post:
 *     tags: [Penalties]
 *     summary: Create penalty
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...sharedPerm(P.COMPLIANCE_WRITE), PenaltyController.create);

/**
 * @openapi
 * /penalties/{id}:
 *   patch:
 *     tags: [Penalties]
 *     summary: Update penalty
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...sharedPerm(P.COMPLIANCE_WRITE), PenaltyController.update);

/**
 * @openapi
 * /penalties/{id}/status:
 *   patch:
 *     tags: [Penalties]
 *     summary: Update penalty status
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', ...sharedPerm(P.COMPLIANCE_WRITE), PenaltyController.updateStatus);

/**
 * @openapi
 * /penalties/{id}:
 *   delete:
 *     tags: [Penalties]
 *     summary: Delete penalty
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...sharedPerm(P.COMPLIANCE_WRITE), PenaltyController.delete);

module.exports = router;
