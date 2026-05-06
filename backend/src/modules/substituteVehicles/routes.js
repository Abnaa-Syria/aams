const router = require('express').Router();
const SubstituteVehicleController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  assignSubstituteVehicleSchema,
  returnSubstituteVehicleSchema,
} = require('./validator');

router.get('/', ...adminPerm(P.FLEET_READ), SubstituteVehicleController.list);

router.post(
  '/',
  ...adminPerm(P.FLEET_WRITE),
  validate(assignSubstituteVehicleSchema),
  SubstituteVehicleController.assign
);

router.patch(
  '/:id/return',
  ...adminPerm(P.FLEET_WRITE),
  validate(returnSubstituteVehicleSchema),
  SubstituteVehicleController.returnVehicle
);

module.exports = router;
