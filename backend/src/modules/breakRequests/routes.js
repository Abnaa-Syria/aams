const router = require('express').Router();
const BreakRequestController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createBreakRequestSchema,
  reviewBreakRequestSchema,
} = require('./validator');

router.get('/', authenticate, BreakRequestController.list);

router.post(
  '/',
  authenticate,
  validate(createBreakRequestSchema),
  BreakRequestController.create
);

router.patch(
  '/:id/review',
  ...adminPerm(P.SHIFTS_APPROVE), // Supervisors/Ops
  validate(reviewBreakRequestSchema),
  BreakRequestController.review
);

router.post('/:id/start', authenticate, BreakRequestController.startBreak);
router.post('/:id/end', authenticate, BreakRequestController.endBreak);

module.exports = router;
