const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { NotFoundError } = require('../../utils/errors');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');
const LeaveRequestController = require('./controller');

/**
 * @openapi
 * /leave-requests:
 *   get:
 *     tags: [Leave]
 *     summary: List leave requests
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...sharedPerm(P.HR_READ), LeaveRequestController.list);

/**
 * @openapi
 * /leave-requests/balances/{userId}:
 *   get:
 *     tags: [Leave]
 *     summary: Leave balances for current year
 *     security:
 *       - bearerAuth: []
 */
router.get('/balances/:userId', ...sharedPerm(P.HR_READ), LeaveRequestController.getBalances);

/**
 * @openapi
 * /leave-requests/{id}:
 *   get:
 *     tags: [Leave]
 *     summary: Get leave request
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.HR_READ), LeaveRequestController.getById);

router.get('/:id/files/attachment/download', ...sharedPerm(P.HR_READ), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const leaveReq = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { userId: true, attachmentUrl: true },
    });
    if (!leaveReq) throw new NotFoundError('Leave Request');
    await assertCanAccessDriverRecord(req, leaveReq.userId);
    const fallbackName = 'leave-attachment';
    await streamAttachmentDownload(res, leaveReq.attachmentUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /leave-requests:
 *   post:
 *     tags: [Leave]
 *     summary: Submit leave request
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...sharedPerm(P.HR_WRITE), upload.single('attachment'), LeaveRequestController.create);

/**
 * @openapi
 * /leave-requests/{id}:
 *   patch:
 *     tags: [Leave]
 *     summary: Update leave request (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...sharedPerm(P.HR_WRITE), LeaveRequestController.update);

/**
 * @openapi
 * /leave-requests/{id}/review:
 *   patch:
 *     tags: [Leave]
 *     summary: Approve/reject leave (admin HR)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/supervisor-review', ...sharedPerm(P.HR_READ), LeaveRequestController.supervisorReview);

router.patch('/:id/review', ...adminMutationPerm(P.HR_APPROVE), LeaveRequestController.review);

/**
 * @openapi
 * /leave-requests/{id}:
 *   delete:
 *     tags: [Leave]
 *     summary: Cancel leave request
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...sharedPerm(P.HR_WRITE), LeaveRequestController.cancel);

module.exports = router;
