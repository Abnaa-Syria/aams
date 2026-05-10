const router = require('express').Router();
const CanceledOrderController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const { reportCanceledOrderSchema } = require('./validator');

router.get('/', ...adminPerm(P.COMPLIANCE_READ), authenticate, CanceledOrderController.list);

router.post(
  '/',
  ...adminPerm(P.COMPLIANCE_WRITE),
  authenticate,
  upload.single('photo'),
  validate(reportCanceledOrderSchema),
  CanceledOrderController.report
);

module.exports = router;
