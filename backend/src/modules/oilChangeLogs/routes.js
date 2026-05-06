const router = require('express').Router();
const OilChangeLogController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const { createOilChangeLogSchema } = require('./validator');

router.get('/', authenticate, OilChangeLogController.list);

router.post(
  '/',
  authenticate,
  upload.single('photo'),
  validate(createOilChangeLogSchema),
  OilChangeLogController.report
);

module.exports = router;
