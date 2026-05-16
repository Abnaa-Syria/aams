const router = require('express').Router();
const OilChangeLogController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const { createOilChangeLogSchema } = require('./validator');

router.get('/', ...sharedPerm(P.FLEET_READ), authenticate, OilChangeLogController.list);

router.post(
  '/',
  ...sharedPerm(P.FLEET_WRITE),
  authenticate,
  upload.single('photo'),
  validate(createOilChangeLogSchema),
  OilChangeLogController.report
);

module.exports = router;
