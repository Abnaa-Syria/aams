const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const PlatformAccountController = require('./controller');

/**
 * @openapi
 * /platform-accounts:
 *   get:
 *     tags: [Platform Accounts]
 *     summary: List platform accounts
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...adminPerm(P.FLEET_READ), PlatformAccountController.list);

/**
 * @openapi
 * /platform-accounts/{id}:
 *   get:
 *     tags: [Platform Accounts]
 *     summary: Get platform account by ID
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, PlatformAccountController.getById);

/**
 * @openapi
 * /platform-accounts:
 *   post:
 *     tags: [Platform Accounts]
 *     summary: Create platform account
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, upload.single('file'), PlatformAccountController.create);

/**
 * @openapi
 * /platform-accounts/{id}:
 *   patch:
 *     tags: [Platform Accounts]
 *     summary: Update platform account
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', authenticate, upload.single('file'), PlatformAccountController.update);

/**
 * @openapi
 * /platform-accounts/{id}/verify:
 *   patch:
 *     tags: [Platform Accounts]
 *     summary: Verify platform account status (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/verify', ...adminPerm(P.FLEET_WRITE), PlatformAccountController.verify);

/**
 * @openapi
 * /platform-accounts/{id}:
 *   delete:
 *     tags: [Platform Accounts]
 *     summary: Soft-delete platform account
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminPerm(P.FLEET_WRITE), PlatformAccountController.delete);

module.exports = router;
