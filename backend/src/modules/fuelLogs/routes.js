const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const FuelLogController = require('./controller');
const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

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

router.get('/:id/receipt/download', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const log = await prisma.fuelLog.findUnique({
      where: { id },
      select: { userId: true, receiptUrl: true },
    });
    if (!log) throw new NotFoundError('Fuel Log');
    await assertCanAccessDriverRecord(req, log.userId);
    const fallbackName = (log.receiptUrl && String(log.receiptUrl).split('/').pop()) || 'receipt';
    await streamAttachmentDownload(res, log.receiptUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

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
 * /fuel-logs/{id}:
 *   patch:
 *     tags: [Fuel Logs]
 *     summary: Update fuel log (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...adminPerm(P.COMPLIANCE_WRITE), FuelLogController.updateLog);

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
