const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const RewardController = require('./controller');

/**
 * @openapi
 * /rewards:
 *   get:
 *     tags: [Rewards]
 *     summary: List rewards
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...sharedPerm(P.HR_READ), RewardController.list);

/**
 * @openapi
 * /rewards/summary:
 *   get:
 *     tags: [Rewards]
 *     summary: Approved rewards totals
 *     security:
 *       - bearerAuth: []
 */
router.get('/summary', ...sharedPerm(P.HR_READ, P.HR_APPROVE), RewardController.getSummary);

/**
 * @openapi
 * /rewards/{id}:
 *   get:
 *     tags: [Rewards]
 *     summary: Get reward by ID
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.HR_READ), RewardController.getById);

/**
 * @openapi
 * /rewards:
 *   post:
 *     tags: [Rewards]
 *     summary: Create reward
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...adminMutationPerm(P.HR_APPROVE), RewardController.create);

/**
 * @openapi
 * /rewards/{id}:
 *   patch:
 *     tags: [Rewards]
 *     summary: Update reward
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...adminMutationPerm(P.HR_APPROVE), RewardController.update);

/**
 * @openapi
 * /rewards/{id}/status:
 *   patch:
 *     tags: [Rewards]
 *     summary: Approve/reject reward
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', ...adminMutationPerm(P.HR_APPROVE), RewardController.updateStatus);

/**
 * @openapi
 * /rewards/{id}:
 *   delete:
 *     tags: [Rewards]
 *     summary: Delete reward
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminMutationPerm(P.HR_APPROVE), RewardController.delete);

module.exports = router;
