const router = require('express').Router();
const CanceledOrderController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const { reportCanceledOrderSchema } = require('./validator');

router.get('/', authenticate, CanceledOrderController.list);

router.post(
  '/',
  authenticate,
  upload.single('photo'),
  validate(reportCanceledOrderSchema),
  CanceledOrderController.report
);

module.exports = router;
