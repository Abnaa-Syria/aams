const router = require('express').Router();
const AdminRequestController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createAdminRequestSchema,
  reviewAdminRequestSchema,
} = require('./validator');

router.get('/', ...adminPerm(P.HR_READ), authenticate, AdminRequestController.list);
router.get('/:id', ...adminPerm(P.HR_READ), authenticate, AdminRequestController.getById);

router.post(
  '/',
  ...adminPerm(P.HR_WRITE),
  authenticate,
  validate(createAdminRequestSchema),
  AdminRequestController.create
);

router.delete('/:id', ...adminPerm(P.HR_WRITE), authenticate, AdminRequestController.cancel);

router.patch(
  '/:id/review',
  ...adminPerm(P.HR_APPROVE), // HR handles vacations/resignation/etc
  validate(reviewAdminRequestSchema),
  AdminRequestController.review
);

module.exports = router;
