const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');
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

router.get('/:id/files/file/download', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const platformAccount = await prisma.platformAccount.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true, fileUrl: true },
    });
    if (!platformAccount) throw new NotFoundError('Platform Account');
    await assertCanAccessDriverRecord(req, platformAccount.userId);
    const fallbackName = 'platform-account-file';
    await streamAttachmentDownload(res, platformAccount.fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

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
