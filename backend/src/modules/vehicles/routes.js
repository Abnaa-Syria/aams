const router = require('express').Router();
const VehicleController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');

/**
 * @openapi
 * /vehicles:
 *   get:
 *     tags: [Vehicles]
 *     summary: List vehicles (FLEET_READ)
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
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated vehicles
 *   post:
 *     tags: [Vehicles]
 *     summary: Create vehicle
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', ...adminPerm(P.FLEET_READ), VehicleController.list);

/**
 * @openapi
 * /vehicles/{id}:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get vehicle by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Vehicle
 *   put:
 *     tags: [Vehicles]
 *     summary: Update vehicle
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
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Vehicles]
 *     summary: Delete vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.get('/:id', ...adminPerm(P.FLEET_READ), VehicleController.getById);
router.post('/', ...adminPerm(P.FLEET_WRITE), VehicleController.create);
router.put('/:id', ...adminPerm(P.FLEET_WRITE), VehicleController.update);

/**
 * @openapi
 * /vehicles/{id}/assign-driver:
 *   post:
 *     tags: [Vehicles]
 *     summary: Assign driver to vehicle
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
 *               userId: { type: integer }
 *     responses:
 *       200:
 *         description: Assigned
 */
router.post('/:id/assign-driver', ...adminPerm(P.FLEET_WRITE), VehicleController.assignDriver);

/**
 * @openapi
 * /vehicles/{id}/release-driver:
 *   post:
 *     tags: [Vehicles]
 *     summary: Release driver from vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Released
 */
router.post('/:id/release-driver', ...adminPerm(P.FLEET_WRITE), VehicleController.releaseDriver);
router.delete('/:id', ...adminPerm(P.FLEET_WRITE), VehicleController.remove);

module.exports = router;
