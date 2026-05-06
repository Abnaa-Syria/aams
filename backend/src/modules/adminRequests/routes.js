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

router.get('/', authenticate, AdminRequestController.list);
router.get('/:id', authenticate, AdminRequestController.getById);

router.post(
  '/',
  authenticate,
  validate(createAdminRequestSchema),
  AdminRequestController.create
);

router.delete('/:id', authenticate, AdminRequestController.cancel);

router.patch(
  '/:id/review',
  ...adminPerm(P.HR_APPROVE), // HR handles vacations/resignation/etc
  validate(reviewAdminRequestSchema),
  AdminRequestController.review
);

module.exports = router;
