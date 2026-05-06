const router = require('express').Router();
const ComplaintController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const upload = require('../../utils/upload');
const {
  createComplaintSchema,
  resolveComplaintSchema,
} = require('./validator');

router.get('/', authenticate, ComplaintController.list);
router.get('/:id', authenticate, ComplaintController.getById);

router.post(
  '/',
  authenticate,
  upload.single('photo'),
  validate(createComplaintSchema),
  ComplaintController.create
);

router.patch(
  '/:id/resolve',
  ...adminPerm(P.HR_APPROVE), // or whatever permission makes sense, perhaps a generic HR one
  validate(resolveComplaintSchema),
  ComplaintController.resolve
);

module.exports = router;
