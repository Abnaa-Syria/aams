const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
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
router.get('/', ...sharedPerm(P.COMPLIANCE_READ), FuelLogController.listLogs);

/**
 * @openapi
 * /fuel-logs/daily-summary:
 *   get:
 *     tags: [Fuel Logs]
 *     summary: Get daily fuel logs summary (total cost, liters, count)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: vehicleId
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fuel log daily summary
 */
router.get('/daily-summary', ...sharedPerm(P.COMPLIANCE_READ), FuelLogController.getDailySummary);

router.get('/:id/receipt/download', ...sharedPerm(P.COMPLIANCE_READ), async (req, res, next) => {
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
router.get('/:id', ...sharedPerm(P.COMPLIANCE_READ), FuelLogController.getLog);

/**
 * @openapi
 * /fuel-logs:
 *   post:
 *     tags: [Fuel Logs]
 *     summary: Submit fuel log (multipart receipt)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...sharedPerm(P.COMPLIANCE_WRITE), upload.single('receipt'), FuelLogController.createLog);

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
