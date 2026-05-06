const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const ViolationController = require('./controller');

/**
 * @openapi
 * /violations:
 *   get:
 *     tags: [Violations]
 *     summary: List violations
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, ViolationController.listViolations);

/**
 * @openapi
 * /violations/{id}:
 *   get:
 *     tags: [Violations]
 *     summary: Get violation by ID (scoped)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, ViolationController.getViolation);

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
  authenticate,
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
