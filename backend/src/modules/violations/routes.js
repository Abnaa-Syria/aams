const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const ViolationController = require('./controller');
const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

const VIOLATION_KIND_TO_FIELD = {
  vehicle: 'vehicleImageUrl',
  violation: 'violationImageUrl',
  bike: 'bikeImageUrl',
};

/**
 * @openapi
 * /violations:
 *   get:
 *     tags: [Violations]
 *     summary: List violations
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ...adminPerm(P.COMPLIANCE_READ), ViolationController.listViolations);

router.get('/:id/files/:kind/download', ...adminPerm(P.COMPLIANCE_READ), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const field = VIOLATION_KIND_TO_FIELD[req.params.kind];
    if (!field) {
      return res.status(400).json({ success: false, message: 'نوع الملف غير صالح' });
    }
    const violation = await prisma.violation.findUnique({
      where: { id },
      select: { userId: true, [field]: true },
    });
    if (!violation) throw new NotFoundError('Violation');
    await assertCanAccessDriverRecord(req, violation.userId);
    const fileUrl = violation[field];
    const fallbackName = `${req.params.kind}${(fileUrl && String(fileUrl).match(/\.[a-z0-9]+$/i))?.[0] || ''}` || `${req.params.kind}-file`;
    await streamAttachmentDownload(res, fileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /violations/{id}:
 *   get:
 *     tags: [Violations]
 *     summary: Get violation by ID (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...adminPerm(P.COMPLIANCE_READ), ViolationController.getViolation);

/**
 * @openapi
 * /violations:
 *   post:
 *     tags: [Violations]
 *     summary: Report violation (multipart vehicleImage, violationImage optional)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  ...adminPerm(P.COMPLIANCE_WRITE),
  upload.fields([
    { name: 'vehicleImage', maxCount: 1 },
    { name: 'violationImage', maxCount: 1 },
    { name: 'bikeImage', maxCount: 1 },
  ]),
  ViolationController.createViolation
);

/**
 * @openapi
 * /violations/{id}:
 *   put:
 *     tags: [Violations]
 *     summary: Update violation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', ...adminPerm(P.COMPLIANCE_WRITE), ViolationController.updateViolation);

/**
 * @openapi
 * /violations/{id}:
 *   patch:
 *     tags: [Violations]
 *     summary: Update violation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...adminPerm(P.COMPLIANCE_WRITE), ViolationController.updateViolation);

/**
 * @openapi
 * /violations/{id}/review:
 *   patch:
 *     tags: [Violations]
 *     summary: Review violation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/review', ...adminPerm(P.COMPLIANCE_WRITE), ViolationController.reviewViolation);

/**
 * @openapi
 * /violations/{id}:
 *   delete:
 *     tags: [Violations]
 *     summary: Delete violation (admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...adminPerm(P.COMPLIANCE_WRITE), ViolationController.deleteViolation);

module.exports = router;
