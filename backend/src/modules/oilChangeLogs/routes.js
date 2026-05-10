const router = require('express').Router();
const OilChangeLogController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const { createOilChangeLogSchema } = require('./validator');

router.get('/', ...adminPerm(P.FLEET_READ), authenticate, OilChangeLogController.list);

router.post(
  '/',
  ...adminPerm(P.FLEET_WRITE),
  authenticate,
  upload.single('photo'),
  validate(createOilChangeLogSchema),
  OilChangeLogController.report
);

module.exports = router;
