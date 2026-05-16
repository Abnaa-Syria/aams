const router = require('express').Router();
const VehicleSwapController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createVehicleSwapSchema,
  reviewVehicleSwapSchema,
} = require('./validator');

router.get('/', ...sharedPerm(P.FLEET_READ), authenticate, VehicleSwapController.list);

router.post(
  '/',
  ...sharedPerm(P.FLEET_WRITE),
  authenticate,
  validate(createVehicleSwapSchema),
  VehicleSwapController.create
);

router.patch(
  '/:id/review',
  ...adminPerm(P.FLEET_WRITE), // Fleet admin handles vehicle swaps
  validate(reviewVehicleSwapSchema),
  VehicleSwapController.review
);

module.exports = router;
