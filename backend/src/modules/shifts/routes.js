const router = require('express').Router();
const ShiftController = require('./controller');
const SHIFT_START_UPLOAD_FIELDS = ShiftController.SHIFT_START_UPLOAD_FIELDS;
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');

/**
 * @openapi
 * /shifts:
 *   get:
 *     tags: [Shifts]
 *     summary: List shifts (scoped for DRIVER/SUPERVISOR; admins see all, optional userId)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [REQUESTED, APPROVED, REJECTED, ACTIVE, ENDED, CANCELLED] }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *       - in: query
 *         name: vehicleId
 *         schema: { type: integer }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated shifts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListResponse'
 */
router.get('/', ...sharedPerm(P.SHIFTS_READ), ShiftController.list);

/**
 * @openapi
 * /shifts/request-start:
 *   post:
 *     tags: [Shifts]
 *     summary: Driver requests shift start (needs active vehicle + platform account)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, platformAccountId]
 *             properties:
 *               vehicleId: { type: integer }
 *               platformAccountId: { type: integer }
 *               startPhotoUrl: { type: string, nullable: true }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Shift created in REQUESTED status
 *       422:
 *         description: Business rules (blocked account, duplicate pending shift, invalid vehicle/account)
 */
router.post(
  '/request-start',
  ...sharedPerm(P.SHIFTS_WRITE),
  upload.fields(SHIFT_START_UPLOAD_FIELDS),
  ShiftController.requestStart,
);

/**
 * @openapi
 * /shifts/{id}:
 *   get:
 *     tags: [Shifts]
 *     summary: Get shift by ID (driver/supervisor scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Shift with relations
 *       404:
 *         description: Not found or no access
 */
router.get('/:id', ...sharedPerm(P.SHIFTS_READ), ShiftController.getById);

/**
 * @openapi
 * /shifts/{id}/start:
 *   post:
 *     tags: [Shifts]
 *     summary: Driver starts shift (status must be APPROVED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Shift ACTIVE
 *       422:
 *         description: Not approved or not owner
 */
router.post('/:id/start', ...sharedPerm(P.SHIFTS_WRITE), ShiftController.startShift);

/**
 * @openapi
 * /shifts/{id}/end:
 *   post:
 *     tags: [Shifts]
 *     summary: Driver ends active shift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endPhotoUrl: { type: string, nullable: true }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Shift ENDED
 */
router.post('/:id/end', ...sharedPerm(P.SHIFTS_WRITE), ShiftController.endShift);

/**
 * @openapi
 * /shifts/{id}/cancel:
 *   post:
 *     tags: [Shifts]
 *     summary: Cancel shift in REQUESTED or APPROVED (driver)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Shift CANCELLED
 */
router.post('/:id/cancel', ...sharedPerm(P.SHIFTS_WRITE), ShiftController.cancel);

/**
 * @openapi
 * /shifts/{id}/approve:
 *   post:
 *     tags: [Shifts]
 *     summary: Approve REQUESTED shift (admin — SHIFTS_APPROVE)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Shift APPROVED
 */
router.post('/:id/approve', ...adminPerm(P.SHIFTS_APPROVE), ShiftController.approve);

/**
 * @openapi
 * /shifts/{id}/reject:
 *   post:
 *     tags: [Shifts]
 *     summary: Reject REQUESTED shift (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Shift REJECTED
 */
router.post('/:id/reject', ...adminPerm(P.SHIFTS_APPROVE), ShiftController.reject);

/**
 * @openapi
 * /shifts/{id}/approve-closure:
 *   post:
 *     tags: [Shifts]
 *     summary: Approve ENDED shift closure (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Shift closure APPROVED
 */
router.post('/:id/approve-closure', ...adminPerm(P.SHIFTS_APPROVE), ShiftController.approveClosure);

module.exports = router;
