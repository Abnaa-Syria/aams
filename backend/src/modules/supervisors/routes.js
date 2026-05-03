const router = require('express').Router();
const SupervisorController = require('./controller');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');

/**
 * @openapi
 * /supervisors:
 *   get:
 *     tags: [Supervisors]
 *     summary: List all supervisors
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
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Supervisors list
 */
router.get('/', ...adminPerm(P.USERS_READ), SupervisorController.list);

/**
 * @openapi
 * /supervisors/{id}:
 *   get:
 *     tags: [Supervisors]
 *     summary: Get supervisor details with assigned drivers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Supervisor details
 */
router.get('/:id', ...adminPerm(P.USERS_READ), SupervisorController.getById);

/**
 * @openapi
 * /supervisors/{id}/drivers:
 *   get:
 *     tags: [Supervisors]
 *     summary: List drivers assigned to supervisor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Drivers list
 */
router.get('/:id/drivers', ...adminPerm(P.USERS_READ), SupervisorController.getDrivers);

/**
 * @openapi
 * /supervisors/{id}/assign-drivers:
 *   post:
 *     tags: [Supervisors]
 *     summary: Assign drivers to supervisor
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
 *               driverIds:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: Drivers assigned
 */
router.post('/:id/assign-drivers', ...adminPerm(P.USERS_WRITE), SupervisorController.assignDrivers);

module.exports = router;
