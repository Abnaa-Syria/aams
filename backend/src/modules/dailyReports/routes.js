const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const { dailyReportUploadMiddleware } = require('../../utils/dailyReportUpload');
const DailyReportController = require('./controller');
const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

/**
 * @openapi
 * /daily-reports:
 *   get:
 *     tags: [Daily Reports]
 *     summary: List daily (end of day) reports
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...sharedPerm(P.SHIFTS_READ), DailyReportController.listReports);

router.get('/:id/screenshots/:screenshotId/download', ...sharedPerm(P.SHIFTS_READ), async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const screenshotId = parseInt(req.params.screenshotId, 10);
    const shot = await prisma.reportScreenshot.findFirst({
      where: { id: screenshotId, reportId },
      include: { report: { select: { userId: true } } },
    });
    if (!shot) throw new NotFoundError('Screenshot');
    await assertCanAccessDriverRecord(req, shot.report.userId);
    const fallbackName = shot.fileName || (shot.fileUrl && String(shot.fileUrl).split('/').pop()) || 'screenshot';
    await streamAttachmentDownload(res, shot.fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /daily-reports/{id}:
 *   get:
 *     tags: [Daily Reports]
 *     summary: Get daily report by ID (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.SHIFTS_READ), DailyReportController.getReport);

/**
 * @openapi
 * /daily-reports:
 *   post:
 *     tags: [Daily Reports]
 *     summary: Submit daily report (multipart screenshots)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...sharedPerm(P.SHIFTS_WRITE), dailyReportUploadMiddleware, DailyReportController.createReport);

/**
 * @openapi
 * /daily-reports/{id}/review:
 *   patch:
 *     tags: [Daily Reports]
 *     summary: Review daily report (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/review', ...adminMutationPerm(P.COMPLIANCE_WRITE), DailyReportController.reviewReport);

/**
 * @openapi
 * /daily-reports/{id}:
 *   delete:
 *     tags: [Daily Reports]
 *     summary: Delete daily report (admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminMutationPerm(P.COMPLIANCE_WRITE), DailyReportController.deleteReport);

module.exports = router;
