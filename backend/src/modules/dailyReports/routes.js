const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const DailyReportController = require('./controller');

/**
 * @openapi
 * /daily-reports:
 *   get:
 *     tags: [Daily Reports]
 *     summary: List daily (end of day) reports
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, DailyReportController.listReports);

/**
 * @openapi
 * /daily-reports/{id}:
 *   get:
 *     tags: [Daily Reports]
 *     summary: Get daily report by ID (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, DailyReportController.getReport);

/**
 * @openapi
 * /daily-reports:
 *   post:
 *     tags: [Daily Reports]
 *     summary: Submit daily report (multipart screenshots)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, upload.array('screenshots', 10), DailyReportController.createReport);

/**
 * @openapi
 * /daily-reports/{id}/review:
 *   patch:
 *     tags: [Daily Reports]
 *     summary: Review daily report (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/review', ...adminPerm(P.COMPLIANCE_WRITE), DailyReportController.reviewReport);

/**
 * @openapi
 * /daily-reports/{id}:
 *   delete:
 *     tags: [Daily Reports]
 *     summary: Delete daily report (admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminPerm(P.COMPLIANCE_WRITE), DailyReportController.deleteReport);

module.exports = router;

module.exports = router;
